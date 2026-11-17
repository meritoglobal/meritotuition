import "server-only";
import { db } from "@/lib/data";
import { BKASH_LIVE, refund } from "./bkash";
import { notify } from "./notify";
import { dhakaDay, isAdmin } from "./people";

/**
 * Tutor Pro: a monthly fee for a Pro badge, first place in suggestions and offers, and email alerts.
 * Money-back guarantee: if no student picks the tutor during a paid month, that month's fee goes back
 * (bKash refund for the cash part, credit for any referral credit used).
 * PRO_REFUND_RULE=NO_REQUEST instead refunds only when no matching request reached the tutor at all.
 */
export const PRO_PRICE = Math.max(100, Number(process.env.PRO_PRICE ?? 499) || 499);
export const REFUND_RULE: "NO_TUITION" | "NO_REQUEST" = process.env.PRO_REFUND_RULE === "NO_REQUEST" ? "NO_REQUEST" : "NO_TUITION";
const MONTH_MS = 30 * 86_400_000;

export interface ProPeriod { id: string; user_id: string; email: string; payment_id: string | null; starts_at: string; ends_at: string; status: "ACTIVE" | "KEPT" | "REFUNDED" | "REFUND_FAILED"; refund_trx: string | null }

export async function proUntil(userId: string): Promise<Date | null> {
  const { data } = await db().from("tutor_pro").select("until").eq("user_id", userId).maybeSingle();
  return data?.until ? new Date(data.until) : null;
}

export const isPro = async (userId: string) => ((await proUntil(userId)) ?? new Date(0)) > new Date();

/** Which of these tutors are Pro right now. */
export async function proSet(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { data } = await db().from("tutor_pro").select("user_id").in("user_id", ids).gt("until", new Date().toISOString());
  return new Set((data ?? []).map((r) => r.user_id));
}

export async function myPeriods(userId: string): Promise<ProPeriod[]> {
  const { data } = await db().from("pro_periods").select("*").eq("user_id", userId).order("starts_at", { ascending: false }).limit(12);
  return (data ?? []) as ProPeriod[];
}

/** After payment: one more month, counted from today or from the current end. */
export async function extendPro(userId: string, email: string, paymentId: string) {
  const s = db();
  const cur = await proUntil(userId);
  const from = cur && cur > new Date() ? cur : new Date();
  const until = new Date(from.getTime() + MONTH_MS);
  await s.from("pro_periods").insert({ user_id: userId, email, payment_id: paymentId, starts_at: from.toISOString(), ends_at: until.toISOString() });
  await s.from("tutor_pro").upsert({ user_id: userId, email, until: until.toISOString(), reminded: null, updated_at: new Date().toISOString() });
  await notify({ email, kind: "PRO", title: "আপনি এখন Pro টিউটর!", body: "এক মাসে টিউশন না পেলে পুরো টাকা ফেরত।", path: "/teach/pro" });
}

/** Did this tutor get what the guarantee promises during the period? */
async function earned(p: ProPeriod): Promise<boolean> {
  const s = db();
  if (REFUND_RULE === "NO_REQUEST") {
    const { count } = await s.from("app_notifications").select("id", { count: "exact", head: true })
      .eq("email", p.email).eq("kind", "REQUEST").gte("created_at", p.starts_at).lt("created_at", p.ends_at);
    return Boolean(count);
  }
  const { count } = await s.from("request_bids").select("id", { count: "exact", head: true })
    .eq("teacher_id", p.user_id).eq("status", "ACCEPTED").gte("decided_at", p.starts_at).lt("decided_at", p.ends_at);
  return Boolean(count);
}

/** Daily: settle finished Pro months. Kept if the tutor got a tuition, otherwise refunded in full. */
export async function settlePro(now = new Date()): Promise<{ kept: number; refunded: number; failed: number }> {
  const s = db();
  const out = { kept: 0, refunded: 0, failed: 0 };
  const { data } = await s.from("pro_periods").select("*").eq("status", "ACTIVE").lt("ends_at", now.toISOString()).limit(200);
  for (const p of (data ?? []) as ProPeriod[]) {
    if (await earned(p)) {
      await s.from("pro_periods").update({ status: "KEPT", settled_at: now.toISOString() }).eq("id", p.id).eq("status", "ACTIVE");
      out.kept++;
      continue;
    }
    // Claim the row first so two runs can't refund twice.
    const { data: claimed } = await s.from("pro_periods").update({ status: "REFUND_FAILED", settled_at: now.toISOString() }).eq("id", p.id).eq("status", "ACTIVE").select("id");
    if (!claimed?.length) continue;
    const { data: pay } = p.payment_id ? await s.from("payments").select("*").eq("id", p.payment_id).maybeSingle() : { data: null };
    let ok = true, trx: string | null = null;
    if (pay && pay.amount > 0 && pay.bkash_payment_id && BKASH_LIVE) {
      const r = await refund({ paymentID: pay.bkash_payment_id, trxID: pay.trx_id ?? "", amount: pay.amount, reason: "Pro guarantee: no tuition this month" }).catch(() => ({ ok: false, refundTrxID: undefined }));
      ok = r.ok; trx = r.refundTrxID ?? null;
    }
    if (ok && pay?.credit_used > 0) await s.from("credits").insert({ email: p.email, amount: pay.credit_used, reason: "PRO_REFUND", ref: p.id });
    if (ok) {
      await s.from("pro_periods").update({ status: "REFUNDED", refund_trx: trx }).eq("id", p.id);
      if (pay) await s.from("payments").update({ refunded_at: now.toISOString() }).eq("id", pay.id);
      await notify({ email: p.email, kind: "PRO", title: "Pro-র টাকা ফেরত দেওয়া হয়েছে", body: `এই মাসে টিউশন হয়নি, তাই ৳${(pay?.amount ?? 0) + (pay?.credit_used ?? 0)} ফেরত গেল।`, path: "/teach/pro", mail: true });
      out.refunded++;
    } else {
      out.failed++;
      for (const admin of (process.env.ADMIN_EMAILS ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(isAdmin)) {
        await notify({ email: admin, kind: "PRO_REFUND_FAILED", title: "Pro রিফান্ড হয়নি, হাতে দেখুন", body: `${p.email}, payment ${p.payment_id}`, mail: true });
      }
    }
  }
  return out;
}

/** Daily: remind tutors whose Pro ends within 3 days, once a day at most. */
export async function proReminders(now = new Date()): Promise<number> {
  const today = dhakaDay(now);
  const soon = new Date(now.getTime() + 3 * 86_400_000).toISOString();
  const { data } = await db().from("tutor_pro").select("user_id,email,until,reminded").gt("until", now.toISOString()).lt("until", soon);
  let n = 0;
  for (const r of data ?? []) {
    if (!r.email || r.reminded === today) continue;
    await notify({ email: r.email, kind: "PRO", title: "আপনার Pro শেষ হতে চলেছে", body: "এক ট্যাপে আরেক মাস বাড়িয়ে নিন।", path: "/teach/pro", mail: true });
    await db().from("tutor_pro").update({ reminded: today }).eq("user_id", r.user_id);
    n++;
  }
  return n;
}
