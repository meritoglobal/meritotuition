import "server-only";
import { extendPro } from "./pro";
import { DATA_LIVE, db } from "@/lib/data";
import { BKASH_LIVE, createPayment, execute, type BkashMode } from "./bkash";
import { notify, SITE } from "./notify";
import { couponDiscount, creditBalance, findCoupon, rewardReferral } from "./referral";

export type Purpose = "PACKAGE" | "TEST" | "DOUBT" | "PRO";

/** Without bKash keys, payments are simulated so the flow can be tried. PAYMENTS_DEMO=off turns that off. */
export const PAY_DEMO = !BKASH_LIVE && process.env.PAYMENTS_DEMO !== "off";
export const PAY_ON = BKASH_LIVE || PAY_DEMO;

export interface Quote { listPrice: number; discount: number; credit: number; amount: number; coupon: string | null; couponOk: boolean }

export async function quote(payer: string, listPrice: number, couponRaw?: string, useCredit = true): Promise<Quote> {
  const k = couponRaw ? await findCoupon(couponRaw) : null;
  const discount = couponDiscount(k, listPrice);
  const balance = useCredit ? Math.max(0, await creditBalance(payer)) : 0;
  const credit = Math.min(balance, listPrice - discount);
  return { listPrice, discount, credit, amount: listPrice - discount - credit, coupon: k?.code ?? null, couponOk: Boolean(k) || !couponRaw };
}

const callback = (pid: string) => `${SITE}/api/bkash/callback?pid=${pid}`;

/**
 * Start paying for something. Returns where to send the payer: bKash, the demo
 * pay page, or (when credit/coupon cover it all) straight to the result.
 */
export async function startPayment(o: {
  purpose: Purpose; refId: string; payer: string; listPrice: number; coupon?: string; useCredit?: boolean;
  saveWallet?: boolean; agreementId?: string | null;
}): Promise<{ url: string; paymentId: string }> {
  if (!DATA_LIVE) throw new Error("data-off");
  const q = await quote(o.payer, o.listPrice, o.coupon, o.useCredit ?? true);
  const mode: BkashMode = o.agreementId ? "0001" : o.saveWallet ? "0000" : "0011";
  const { data: row, error } = await db().from("payments").insert({
    purpose: o.purpose, ref_id: o.refId, payer_email: o.payer, list_price: q.listPrice, discount: q.discount,
    credit_used: q.credit, amount: q.amount, coupon_code: q.coupon, mode,
  }).select("id").single();
  if (error || !row) throw new Error("db");
  const pid = row.id as string;
  if (q.amount <= 0) {
    await markPaid(pid, {});
    return { url: resultPath(o.purpose, o.refId, "success"), paymentId: pid };
  }
  if (!BKASH_LIVE) {
    if (!PAY_DEMO) throw new Error("payments-off");
    return { url: `/pay/demo?pid=${pid}`, paymentId: pid };
  }
  const p = await createPayment({ mode, payerReference: o.payer, callbackURL: callback(pid), amount: q.amount, invoice: pid.replace(/-/g, "").slice(0, 20), agreementID: o.agreementId ?? undefined });
  await db().from("payments").update({ bkash_payment_id: p.paymentID }).eq("id", pid);
  return { url: p.url, paymentId: pid };
}

export function resultPath(purpose: Purpose, refId: string, status: "success" | "failure" | "cancel"): string {
  const q = status === "success" ? "paid=1" : `paid=0&why=${status}`;
  if (purpose === "PACKAGE") return `/packages?${q}`;
  if (purpose === "TEST") return `/leaderboard/${refId}?${q}`;
  if (purpose === "PRO") return `/teach/pro?${q}`;
  return `/ask/${refId}?${q}`;
}

interface PaymentRow { id: string; purpose: Purpose; ref_id: string; payer_email: string; amount: number; credit_used: number; coupon_code: string | null; status: string; mode: string; bkash_payment_id: string | null }

/** bKash came back. Returns the page to show next (another bKash step when a wallet was just saved). */
export async function handleCallback(pid: string, paymentID: string, status: string): Promise<string> {
  const s = db();
  const { data } = await s.from("payments").select("*").eq("id", pid).maybeSingle();
  const p = data as PaymentRow | null;
  if (!p) return "/";
  if (p.status === "PAID") return resultPath(p.purpose, p.ref_id, "success");
  if (p.bkash_payment_id && p.bkash_payment_id !== paymentID) return resultPath(p.purpose, p.ref_id, "failure");
  if (status !== "success") {
    await s.from("payments").update({ status: status === "cancel" ? "CANCELLED" : "FAILED" }).eq("id", pid);
    return resultPath(p.purpose, p.ref_id, status === "cancel" ? "cancel" : "failure");
  }
  const ex = await execute(paymentID);
  if (!ex.ok) {
    await s.from("payments").update({ status: "FAILED" }).eq("id", pid);
    return resultPath(p.purpose, p.ref_id, "failure");
  }
  if (p.mode === "0000") {
    // Wallet saved. Remember it, then take this month's money with it (PIN only).
    if (p.purpose === "PACKAGE" && ex.agreementID) {
      await s.from("subscriptions").update({ agreement_id: ex.agreementID, payer_msisdn: ex.msisdn ?? null }).eq("id", p.ref_id);
    }
    const next = await createPayment({ mode: "0001", payerReference: p.payer_email, callbackURL: callback(pid), amount: p.amount, invoice: pid.replace(/-/g, "").slice(0, 20), agreementID: ex.agreementID });
    await s.from("payments").update({ bkash_payment_id: next.paymentID, mode: "0001" }).eq("id", pid);
    return next.url;
  }
  await markPaid(pid, { trx: ex.trxID });
  return resultPath(p.purpose, p.ref_id, "success");
}

/** Money is in: record it, spend credit and coupon, and deliver what was bought. */
export async function markPaid(pid: string, o: { trx?: string }) {
  const s = db();
  const { data } = await s.from("payments").update({ status: "PAID", trx_id: o.trx ?? null, paid_at: new Date().toISOString() })
    .eq("id", pid).neq("status", "PAID").select("*").maybeSingle();
  const p = data as PaymentRow | null;
  if (!p) return; // already handled
  if (p.credit_used > 0) await s.from("credits").insert({ email: p.payer_email, amount: -p.credit_used, reason: "SPENT", ref: pid });
  if (p.coupon_code) await s.rpc("use_coupon", { c: p.coupon_code });
  if (p.purpose === "PACKAGE") await fulfilPackage(p.ref_id);
  if (p.purpose === "DOUBT") await fulfilDoubt(p.ref_id);
  if (p.purpose === "PRO") await extendPro(p.ref_id, p.payer_email);
}

const MONTH_MS = 30 * 86_400_000;

async function fulfilPackage(subId: string) {
  const s = db();
  const { data: sub } = await s.from("subscriptions").select("*, packages(*)").eq("id", subId).maybeSingle();
  if (!sub) return;
  const pkg = sub.packages as { batch_id: string | null; title: string; teacher_email: string | null; teacher_name: string | null };
  const from = sub.current_period_end && new Date(sub.current_period_end) > new Date() ? new Date(sub.current_period_end) : new Date();
  await s.from("subscriptions").update({ status: "ACTIVE", current_period_end: new Date(from.getTime() + MONTH_MS).toISOString() }).eq("id", subId);
  if (pkg.batch_id) await s.from("batch_students").upsert({ batch_id: pkg.batch_id, email: sub.student_email }, { onConflict: "batch_id,email", ignoreDuplicates: true });
  await rewardReferral(sub.payer_email);
  if (sub.payer_email !== sub.student_email) await rewardReferral(sub.student_email);
  if (pkg.teacher_email) await notify({ email: pkg.teacher_email, kind: "PACKAGE_PAID", title: `নতুন মাস শুরু: ${pkg.title}`, body: `${sub.student_email} এই মাসের টাকা দিয়েছে।`, path: "/teach/packages" });
  await notify({ email: sub.student_email, kind: "PACKAGE_PAID", title: "এই মাসের টাকা জমা হয়েছে", body: pkg.title, path: "/packages" });
}

async function fulfilDoubt(doubtId: string) {
  const s = db();
  const { data: d } = await s.from("doubts").update({ status: "OPEN" }).eq("id", doubtId).eq("status", "WAITING_PAYMENT").select("subject").maybeSingle();
  if (!d) return;
  const { data: tutors } = await s.from("teacher_profiles").select("email").contains("subjects", [d.subject]).not("email", "is", null).limit(30);
  for (const t of tutors ?? []) await notify({ email: t.email, kind: "DOUBT_OPEN", title: "নতুন প্রশ্ন এসেছে", body: "প্রথম যিনি ধরবেন, উত্তর তাঁর।", path: "/teach/questions" });
}

/** Has this person paid for this thing? (model tests) */
export async function hasPaid(purpose: Purpose, refId: string, payer: string): Promise<boolean> {
  const { count } = await db().from("payments").select("id", { count: "exact", head: true }).eq("purpose", purpose).eq("ref_id", refId).eq("payer_email", payer).eq("status", "PAID");
  return Boolean(count);
}
