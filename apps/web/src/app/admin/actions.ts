"use server";
import { revalidatePath } from "next/cache";
import { isSegment } from "@mastermoshai/core";
import { adminOrNull, audit, forgetAdmins, forgetBlock, int, OWNER_EMAILS, str } from "@/lib/admin/core";
import { mergeTiers, saveSetting } from "@/lib/admin/settings";
import { db } from "@/lib/data";
import { forceDecide, getChange } from "@/lib/biz/schedule";
import { isEmail } from "@/lib/growth/people";
import { notify } from "@/lib/growth/notify";

/** Every action: admin only, logged, then refresh the page it came from. */
async function run(path: string, fn: (admin: string) => Promise<void>) {
  const m = await adminOrNull();
  if (!m) return;
  await fn(m.email);
  revalidatePath(path, "layout");
}

// ---------------------------------------------------------------- people

export async function blockUser(userId: string, email: string, f: FormData) {
  await run("/admin", async (by) => {
    if (OWNER_EMAILS.includes(email.toLowerCase())) return; // owners cannot be locked out
    const reason = str(f, "reason") || null;
    const s = db();
    await s.from("account_blocks").upsert({ email: email.toLowerCase(), user_id: userId, reason, blocked_by: by });
    await s.auth.admin.updateUserById(userId, { ban_duration: "876000h" }).catch(() => null);
    await s.from("teacher_profiles").update({ hidden: true }).eq("user_id", userId);
    forgetBlock();
    await audit(by, "BLOCK_USER", email, { reason });
  });
}

export async function unblockUser(userId: string, email: string) {
  await run("/admin", async (by) => {
    const s = db();
    await s.from("account_blocks").delete().eq("email", email.toLowerCase());
    await s.auth.admin.updateUserById(userId, { ban_duration: "none" }).catch(() => null);
    await s.from("teacher_profiles").update({ hidden: false }).eq("user_id", userId);
    forgetBlock();
    await audit(by, "UNBLOCK_USER", email);
  });
}

export async function giveCredit(email: string, f: FormData) {
  await run("/admin", async (by) => {
    const amount = int(f, "amount");
    if (!amount || Math.abs(amount) > 100000) return;
    const note = str(f, "note", 120) || null;
    await db().from("credits").insert({ email, amount, reason: "ADMIN", ref: note ?? by });
    if (amount > 0) await notify({ email, kind: "CREDIT", title: `৳${amount} ক্রেডিট যোগ হয়েছে`, body: note ?? "মাস্টারমশাইয়ের পক্ষ থেকে। পরের পেমেন্টে নিজে থেকেই কাটা যাবে।", path: "/refer" });
    await audit(by, "CREDIT", email, { amount, note });
  });
}

export async function setSegment(email: string, f: FormData) {
  await run("/admin", async (by) => {
    const seg = str(f, "segment");
    const s = db();
    if (!seg) await s.from("student_segments").delete().eq("email", email);
    else if (isSegment(seg)) await s.from("student_segments").upsert({ email, segment: seg, set_at: new Date().toISOString(), set_by: by });
    else return;
    await audit(by, "SET_SEGMENT", email, { segment: seg || null });
  });
}

export async function notifyOne(email: string, f: FormData) {
  await run("/admin", async (by) => {
    const title = str(f, "title", 120);
    if (!title) return;
    const body = str(f, "body", 1000) || undefined;
    await notify({ email, kind: "ADMIN", title, body, path: str(f, "path", 200) || undefined, mail: f.get("mail") === "1" });
    await audit(by, "NOTIFY", email, { title });
  });
}

// ---------------------------------------------------------------- tutors

export async function setTutorFlag(userId: string, flag: "verified" | "expert" | "hidden", on: boolean) {
  await run("/admin", async (by) => {
    await db().from("teacher_profiles").update({ [flag]: on }).eq("user_id", userId);
    if (flag === "verified") await db().from("tutor_verifications").update({ status: on ? "APPROVED" : "REJECTED", decided_at: new Date().toISOString(), note: on ? null : "admin" }).eq("user_id", userId);
    await audit(by, `TUTOR_${flag.toUpperCase()}_${on ? "ON" : "OFF"}`, userId);
  });
}

export async function walletAdjust(teacherId: string, f: FormData) {
  await run("/admin", async (by) => {
    const amount = int(f, "amount");
    const note = str(f, "note", 200);
    if (!amount || Math.abs(amount) > 500000 || !note) return;
    await db().from("wallet_entries").insert({ teacher_id: teacherId, amount, kind: "ADJUST", ref: `admin:${crypto.randomUUID()}`, note: `${note} (${by})` });
    await audit(by, "WALLET_ADJUST", teacherId, { amount, note });
  });
}

// ---------------------------------------------------------------- batches & classes

export async function setBatchActive(batchId: string, on: boolean) {
  await run("/admin", async (by) => {
    await db().from("batches").update({ active: on }).eq("id", batchId);
    await audit(by, on ? "BATCH_ON" : "BATCH_OFF", batchId);
  });
}

export async function addToBatch(batchId: string, f: FormData) {
  await run("/admin", async (by) => {
    const email = str(f, "email", 200).toLowerCase();
    if (!isEmail(email)) return;
    await db().from("batch_students").upsert({ batch_id: batchId, email, name: str(f, "name", 80) || null }, { onConflict: "batch_id,email", ignoreDuplicates: true });
    await audit(by, "BATCH_ADD_STUDENT", batchId, { email });
  });
}

export async function removeFromBatch(batchId: string, email: string) {
  await run("/admin", async (by) => {
    await db().from("batch_students").delete().eq("batch_id", batchId).eq("email", email);
    await audit(by, "BATCH_REMOVE_STUDENT", batchId, { email });
  });
}

export async function decideChange(changeId: string, ok: boolean) {
  await run("/admin", async (by) => {
    const ch = await getChange(changeId);
    if (!ch || ch.status !== "PENDING") return;
    await forceDecide(ch, ok ? "APPROVED" : "REJECTED");
    await audit(by, ok ? "ROUTINE_FORCE_APPROVE" : "ROUTINE_FORCE_REJECT", changeId);
  });
}

export async function holdSession(sessionId: string) {
  await run("/admin", async (by) => {
    await db().from("class_sessions").update({ status: "HELD_BACK" }).eq("id", sessionId).in("status", ["OPEN", "EMPTY"]);
    await audit(by, "SESSION_HOLD", sessionId);
  });
}

// ---------------------------------------------------------------- tuition requests

export async function setRequestStatus(id: string, status: "OPEN" | "CLOSED") {
  await run("/admin", async (by) => {
    const patch: Record<string, unknown> = { status };
    if (status === "OPEN") patch.expires_at = new Date(Date.now() + 14 * 86400_000).toISOString();
    await db().from("tuition_requests").update(patch).eq("id", id);
    await audit(by, `REQUEST_${status}`, id);
  });
}

export async function removeBid(id: string) {
  await run("/admin", async (by) => {
    await db().from("request_bids").update({ status: "WITHDRAWN" }).eq("id", id).eq("status", "PENDING");
    await audit(by, "BID_REMOVE", id);
  });
}

// ---------------------------------------------------------------- money

export async function cancelSubscription(table: "subscriptions" | "content_subscriptions", id: string) {
  await run("/admin", async (by) => {
    await db().from(table).update({ status: "CANCELLED", auto_renew: false }).eq("id", id);
    await audit(by, table === "subscriptions" ? "SUB_CANCEL" : "CONTENT_SUB_CANCEL", id);
  });
}

export async function extendSubscription(table: "subscriptions" | "content_subscriptions", id: string, f: FormData) {
  await run("/admin", async (by) => {
    const days = int(f, "days");
    if (!days || days < 1 || days > 365) return;
    const s = db();
    const { data } = await s.from(table).select("current_period_end").eq("id", id).maybeSingle();
    if (!data) return;
    const from = Math.max(Date.now(), data.current_period_end ? new Date(data.current_period_end).getTime() : 0);
    await s.from(table).update({ status: "ACTIVE", current_period_end: new Date(from + days * 86400_000).toISOString() }).eq("id", id);
    await audit(by, "SUB_EXTEND", id, { table, days });
  });
}

export async function setPackageActive(id: string, on: boolean) {
  await run("/admin", async (by) => {
    await db().from("packages").update({ active: on }).eq("id", id);
    await audit(by, on ? "PACKAGE_ON" : "PACKAGE_OFF", id);
  });
}

export async function saveCoupon(f: FormData) {
  await run("/admin", async (by) => {
    const code = str(f, "code", 30).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const pct = int(f, "percent"), amt = int(f, "amount"), max = int(f, "max");
    const exp = str(f, "expires", 20);
    if (!code || (!(pct >= 1 && pct <= 100) && !(amt > 0))) return;
    await db().from("coupons").upsert({
      code, percent_off: pct >= 1 && pct <= 100 ? pct : null, amount_off: pct >= 1 ? null : amt,
      max_uses: max > 0 ? max : null, expires_at: exp ? new Date(`${exp}T23:59:59+06:00`).toISOString() : null, active: true,
    });
    await audit(by, "COUPON_SAVE", code, { pct, amt, max, exp });
  });
}

export async function setCouponActive(code: string, on: boolean) {
  await run("/admin", async (by) => {
    await db().from("coupons").update({ active: on }).eq("code", code);
    await audit(by, on ? "COUPON_ON" : "COUPON_OFF", code);
  });
}

// ---------------------------------------------------------------- content

export async function setTestPublished(id: string, on: boolean) {
  await run("/admin", async (by) => {
    await db().from("model_tests").update({ published: on }).eq("id", id);
    await audit(by, on ? "TEST_PUBLISH" : "TEST_HIDE", id);
  });
}

export async function deleteTest(id: string) {
  await run("/admin", async (by) => {
    await db().from("model_tests").delete().eq("id", id);
    await audit(by, "TEST_DELETE", id);
  });
}

export async function answerDoubt(id: string, f: FormData) {
  await run("/admin", async (by) => {
    const answer = str(f, "answer", 4000);
    if (!answer) return;
    const s = db();
    const { data } = await s.from("doubts").update({ status: "ANSWERED", tutor_email: by, tutor_name: "মাস্টারমশাই টিম", tutor_answer: answer, answered_at: new Date().toISOString() })
      .eq("id", id).in("status", ["OPEN", "CLAIMED"]).select("asker_email").maybeSingle();
    if (data) await notify({ email: data.asker_email, kind: "DOUBT_ANSWERED", title: "তোমার প্রশ্নের উত্তর এসেছে", path: `/ask/${id}` });
    await audit(by, "DOUBT_ANSWER", id);
  });
}

export async function reopenDoubt(id: string) {
  await run("/admin", async (by) => {
    await db().from("doubts").update({ status: "OPEN", tutor_email: null, tutor_name: null, claimed_at: null }).eq("id", id).eq("status", "CLAIMED");
    await audit(by, "DOUBT_RELEASE", id);
  });
}

// ---------------------------------------------------------------- chat

export async function deleteMessage(id: number, threadId: string) {
  await run("/admin", async (by) => {
    await db().from("chat_messages").update({ body: "— অ্যাডমিন এই মেসেজটি সরিয়েছেন —", masked: true }).eq("id", id).eq("thread_id", threadId);
    await audit(by, "CHAT_REMOVE_MESSAGE", threadId, { id });
  });
}

// ---------------------------------------------------------------- announce

export type Audience = "all" | "tutors" | "students" | "parents" | "unverified";

async function audienceEmails(a: Audience): Promise<string[]> {
  const s = db();
  const col = async (q: PromiseLike<{ data: Record<string, unknown>[] | null }>, k: string) => ((await q).data ?? []).map((r) => String(r[k] ?? "").toLowerCase()).filter(Boolean);
  let list: string[] = [];
  if (a === "all") {
    const { data, error } = await s.rpc("admin_all_emails");
    list = error ? [] : ((data ?? []) as { email: string }[]).map((r) => r.email.toLowerCase());
  } else if (a === "tutors") list = await col(s.from("teacher_profiles").select("email").not("email", "is", null).limit(50000), "email");
  else if (a === "unverified") list = await col(s.from("teacher_profiles").select("email").eq("verified", false).not("email", "is", null).limit(50000), "email");
  else if (a === "parents") list = await col(s.from("guardian_links").select("guardian_email").limit(50000), "guardian_email");
  else {
    list = [
      ...(await col(s.from("batch_students").select("email").limit(50000), "email")),
      ...(await col(s.from("subscriptions").select("student_email").limit(50000), "student_email")),
      ...(await col(s.from("content_subscriptions").select("student_email").limit(50000), "student_email")),
    ];
  }
  return [...new Set(list)];
}

export async function announce(f: FormData) {
  await run("/admin/announce", async (by) => {
    const aud = str(f, "audience") as Audience;
    if (!["all", "tutors", "students", "parents", "unverified"].includes(aud)) return;
    const title = str(f, "title", 120);
    if (!title) return;
    const body = str(f, "body", 1000) || null;
    const path = str(f, "path", 200) || null;
    const emails = await audienceEmails(aud);
    const s = db();
    for (let i = 0; i < emails.length; i += 500) {
      await s.from("app_notifications").insert(emails.slice(i, i + 500).map((email) => ({ email, kind: "ANNOUNCE", title, body, path })));
    }
    await audit(by, "ANNOUNCE", aud, { title, sent: emails.length });
  });
}

// ---------------------------------------------------------------- settings

export async function addAdmin(f: FormData) {
  await run("/admin/settings", async (by) => {
    const email = str(f, "email", 200).toLowerCase();
    if (!isEmail(email)) return;
    await db().from("admin_users").upsert({ email, added_by: by });
    forgetAdmins();
    await audit(by, "ADMIN_ADD", email);
  });
}

export async function removeAdmin(email: string) {
  await run("/admin/settings", async (by) => {
    if (email === by) return; // nobody removes themselves by accident
    await db().from("admin_users").delete().eq("email", email);
    forgetAdmins();
    await audit(by, "ADMIN_REMOVE", email);
  });
}

export async function saveTiers(f: FormData) {
  await run("/", async (by) => {
    const codes = f.getAll("code").map(String);
    const edits = codes.map((code) => ({ code, minStudents: int(f, `min_${code}`), rate: Number(String(f.get(`rate_${code}`) ?? "")) / 100 }));
    const tiers = mergeTiers(edits);
    await saveSetting("commission_tiers", tiers.map((t) => ({ code: t.code, minStudents: t.minStudents, rate: t.rate })), by);
    await audit(by, "TIERS_SAVE", null, { tiers: tiers.map((t) => `${t.code}:${t.minStudents}:${t.rate}`) });
  });
}

export async function savePrice(f: FormData) {
  await run("/", async (by) => {
    const p = int(f, "price");
    if (!(p >= 100 && p <= 100000)) return;
    await saveSetting("content_price", p, by);
    await audit(by, "CONTENT_PRICE", null, { price: p });
  });
}

export async function saveNotice(f: FormData) {
  await run("/", async (by) => {
    const bn = str(f, "bn", 300), en = str(f, "en", 300);
    await saveSetting("site_notice", bn || en ? { bn, en, tone: f.get("tone") === "warn" ? "warn" : "info" } : {}, by);
    await audit(by, "SITE_NOTICE", null, { bn, en });
  });
}
