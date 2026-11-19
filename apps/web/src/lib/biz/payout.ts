import "server-only";
import { normalizeMsisdn, withdrawable } from "@mastermoshai/core";
import { db } from "@/lib/data";
import { notify } from "@/lib/growth/notify";
import { b2cPayout, PAYOUT_LIVE } from "./bkash-payout";

export const MIN_WITHDRAW = Number(process.env.MIN_WITHDRAW ?? 50);
export { PAYOUT_LIVE };

export async function saveWalletNumber(teacherId: string, email: string, raw: string, autoPayout?: boolean): Promise<string | null> {
  const n = normalizeMsisdn(raw);
  if (!n) return null;
  await db().from("teacher_wallets").upsert({ teacher_id: teacherId, teacher_email: email, bkash_number: n, ...(autoPayout === undefined ? {} : { auto_payout: autoPayout }), updated_at: new Date().toISOString() }, { onConflict: "teacher_id" });
  return n;
}

export async function setAutoPayout(teacherId: string, on: boolean) {
  await db().from("teacher_wallets").update({ auto_payout: on, updated_at: new Date().toISOString() }).eq("teacher_id", teacherId);
}

export type WithdrawError = "number" | "min" | "balance" | "bad" | "db" | "unverified";

/** Take up to 100% of the balance out to the saved bKash number. Sends at once when payout is live. */
export async function withdraw(teacherId: string, email: string, amount: number): Promise<{ id: string; status: string } | { error: WithdrawError }> {
  const s = db();
  // Money only leaves to ID-verified tutors.
  const { data: prof } = await s.from("teacher_profiles").select("verified").eq("user_id", teacherId).maybeSingle();
  if (!prof?.verified) return { error: "unverified" };
  const { data: tw } = await s.from("teacher_wallets").select("bkash_number").eq("teacher_id", teacherId).maybeSingle();
  if (!tw?.bkash_number) return { error: "number" };
  const { data: bal } = await s.rpc("wallet_balance", { t: teacherId });
  const chk = withdrawable(Number(bal ?? 0), amount, MIN_WITHDRAW);
  if (!chk.ok) return { error: chk.why };
  const { data: id, error } = await s.rpc("request_withdrawal", { t: teacherId, t_email: email, amt: amount, num: tw.bkash_number, min_amt: MIN_WITHDRAW });
  if (error || !id) return { error: error ? "db" : "balance" };
  const status = PAYOUT_LIVE ? await send(id as string) : "QUEUED";
  return { id: id as string, status };
}

/** Try to send one queued withdrawal through bKash. Failed ones go back to the wallet. */
export async function send(id: string): Promise<string> {
  const s = db();
  const { data: w } = await s.from("withdrawals").update({ status: "SENDING" }).eq("id", id).eq("status", "QUEUED").select("*").maybeSingle();
  if (!w) return "SKIPPED";
  const r = await b2cPayout({ amount: w.amount, msisdn: w.msisdn, invoice: `W${id.replace(/-/g, "").slice(0, 18)}` });
  if (r.ok) {
    await s.from("withdrawals").update({ status: "PAID", trx_id: r.trxID, paid_at: new Date().toISOString(), attempts: w.attempts + 1 }).eq("id", id);
    if (w.teacher_email) await notify({ email: w.teacher_email, kind: "PAYOUT", title: `৳${w.amount} বিকাশে পাঠানো হয়েছে`, body: `${w.msisdn} · TrxID ${r.trxID}`, path: "/teach/wallet" });
    return "PAID";
  }
  await fail(w, r.error ?? "failed");
  return "FAILED";
}

async function fail(w: { id: string; teacher_id: string; teacher_email: string | null; amount: number; attempts: number }, error: string) {
  const s = db();
  await s.from("withdrawals").update({ status: "FAILED", error, attempts: w.attempts + 1 }).eq("id", w.id);
  await s.from("wallet_entries").upsert({ teacher_id: w.teacher_id, amount: w.amount, kind: "REVERSAL", ref: w.id, note: error.slice(0, 200) }, { onConflict: "kind,ref", ignoreDuplicates: true });
  if (w.teacher_email) await notify({ email: w.teacher_email, kind: "PAYOUT_FAILED", title: `৳${w.amount} পাঠানো যায়নি`, body: "টাকা আবার ওয়ালেটে ফেরত এসেছে। বিকাশ নম্বরটা ঠিক আছে কি না দেখে আবার চেষ্টা করুন।", path: "/teach/wallet" });
}

/** Admin: money sent by hand (before bKash payout is switched on), or mark as failed. */
export async function adminSettle(id: string, ok: boolean, trx?: string) {
  const s = db();
  const { data: w } = await s.from("withdrawals").select("*").eq("id", id).in("status", ["QUEUED", "SENDING"]).maybeSingle();
  if (!w) return;
  if (ok) {
    await s.from("withdrawals").update({ status: "PAID", trx_id: trx || null, paid_at: new Date().toISOString() }).eq("id", id);
    if (w.teacher_email) await notify({ email: w.teacher_email, kind: "PAYOUT", title: `৳${w.amount} বিকাশে পাঠানো হয়েছে`, body: `${w.msisdn}${trx ? ` · TrxID ${trx}` : ""}`, path: "/teach/wallet" });
  } else await fail(w, "admin");
}

/** Cron: tutors with auto payout get their whole balance; queued requests are sent. */
export async function payoutSweep(): Promise<{ auto: number; sent: number }> {
  const s = db();
  let auto = 0, sent = 0;
  const { data: autos } = await s.from("teacher_wallets").select("teacher_id,teacher_email").eq("auto_payout", true).not("bkash_number", "is", null);
  for (const a of autos ?? []) {
    const { data: bal } = await s.rpc("wallet_balance", { t: a.teacher_id });
    if (Number(bal ?? 0) >= MIN_WITHDRAW && "id" in (await withdraw(a.teacher_id, a.teacher_email ?? "", Number(bal)))) auto++;
  }
  if (PAYOUT_LIVE) {
    const { data: q } = await s.from("withdrawals").select("id").eq("status", "QUEUED").order("created_at").limit(100);
    for (const w of q ?? []) if ((await send(w.id)) === "PAID") sent++;
  }
  return { auto, sent };
}
