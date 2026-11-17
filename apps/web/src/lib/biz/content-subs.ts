import "server-only";
import { SEGMENT_LABEL, SEGMENT_PRICE, type ContentSegment } from "@mastermoshai/core";
import { db } from "@/lib/data";
import { notify } from "@/lib/growth/notify";
import { isUuid } from "@/lib/growth/people";
import { startPayment } from "@/lib/growth/pay";

/** ৳999 by default; CONTENT_PRICE overrides it. */
export const CONTENT_PRICE = (() => {
  const v = Number(process.env.CONTENT_PRICE);
  return Number.isInteger(v) && v >= 100 ? v : SEGMENT_PRICE;
})();

export interface ContentSub {
  id: string; segment: ContentSegment; student_email: string; payer_email: string; price: number;
  status: "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELLED"; auto_renew: boolean; agreement_id: string | null;
  payer_msisdn: string | null; current_period_end: string | null; created_at: string;
}

const q = (v: string) => `"${v.replace(/["\\]/g, "")}"`;

export async function myContentSubs(email: string): Promise<ContentSub[]> {
  const { data } = await db().from("content_subscriptions").select("*").or(`student_email.eq.${q(email)},payer_email.eq.${q(email)}`).neq("status", "PENDING").order("created_at", { ascending: false });
  return (data ?? []) as ContentSub[];
}

export async function getContentSub(id: string, email: string): Promise<ContentSub | null> {
  if (!isUuid(id)) return null;
  const { data } = await db().from("content_subscriptions").select("*").eq("id", id).maybeSingle();
  const s = data as ContentSub | null;
  return s && (s.payer_email === email || s.student_email === email) ? s : null;
}

/** Start or restart a segment subscription for one student (the payer may be a parent). */
export async function subscribeSegment(o: { segment: ContentSegment; payer: string; student: string; autoRenew: boolean; coupon?: string }) {
  const s = db();
  const { data: existing } = await s.from("content_subscriptions").select("id,agreement_id").eq("segment", o.segment).eq("student_email", o.student).neq("status", "CANCELLED").maybeSingle();
  let id = existing?.id as string | undefined;
  if (!id) {
    const { data, error } = await s.from("content_subscriptions").insert({ segment: o.segment, student_email: o.student, payer_email: o.payer, price: CONTENT_PRICE, auto_renew: o.autoRenew }).select("id").single();
    if (error) throw new Error("db");
    id = data.id as string;
  } else {
    await s.from("content_subscriptions").update({ auto_renew: o.autoRenew, payer_email: o.payer, price: CONTENT_PRICE }).eq("id", id);
  }
  return startPayment({
    purpose: "CONTENT", refId: id, payer: o.payer, listPrice: CONTENT_PRICE, coupon: o.coupon,
    saveWallet: o.autoRenew && !existing?.agreement_id, agreementId: o.autoRenew ? existing?.agreement_id : null,
  });
}

export async function renewContent(sub: ContentSub, payer: string) {
  return startPayment({ purpose: "CONTENT", refId: sub.id, payer, listPrice: sub.price, agreementId: sub.auto_renew ? sub.agreement_id : null, saveWallet: sub.auto_renew && !sub.agreement_id });
}

export async function setContentAutoRenew(sub: ContentSub, on: boolean) {
  await db().from("content_subscriptions").update({ auto_renew: on }).eq("id", sub.id);
}

/** Stops renewing; access stays until the paid month ends. */
export async function cancelContent(sub: ContentSub) {
  const running = sub.status === "ACTIVE" && sub.current_period_end && new Date(sub.current_period_end) > new Date();
  await db().from("content_subscriptions").update(running ? { auto_renew: false } : { auto_renew: false, status: "CANCELLED" }).eq("id", sub.id);
}

const MONTH_MS = 30 * 86_400_000;

/** Paid: add a month (from today, or from the end of the current month if it is still running). */
export async function fulfilContent(subId: string) {
  const s = db();
  const { data: sub } = await s.from("content_subscriptions").select("*").eq("id", subId).maybeSingle();
  if (!sub) return;
  const from = sub.current_period_end && new Date(sub.current_period_end) > new Date() ? new Date(sub.current_period_end) : new Date();
  await s.from("content_subscriptions").update({ status: "ACTIVE", current_period_end: new Date(from.getTime() + MONTH_MS).toISOString() }).eq("id", subId);
  await notify({ email: sub.student_email, kind: "CONTENT_PAID", title: `${SEGMENT_LABEL[sub.segment as ContentSegment].bn}: সব লেকচার শিট আর পরীক্ষা খুলে গেছে`, body: "পড়া শুরু করো!", path: `/learn?segment=${sub.segment}` });
}

/** Daily: remind 3 days before the month ends; mark unpaid months as PAST_DUE. */
export async function contentRenewalSweep(now = new Date()): Promise<{ reminded: number; lapsed: number }> {
  const s = db();
  const soon = new Date(now.getTime() + 3 * 86_400_000).toISOString();
  const { data: due } = await s.from("content_subscriptions").select("id,payer_email,segment,price,auto_renew").eq("status", "ACTIVE").eq("auto_renew", true).lte("current_period_end", soon).gt("current_period_end", now.toISOString());
  let reminded = 0;
  for (const d of due ?? []) {
    const path = `/learn?renew=${d.id}`;
    const { count } = await s.from("app_notifications").select("id", { count: "exact", head: true }).eq("email", d.payer_email).eq("kind", "RENEW").eq("path", path).gte("created_at", new Date(now.getTime() - 5 * 86_400_000).toISOString());
    if (count) continue;
    await notify({ email: d.payer_email, kind: "RENEW", mail: true, title: `${SEGMENT_LABEL[d.segment as ContentSegment].bn} কনটেন্ট: পরের মাসের ৳${d.price}`, body: "বিকাশ সেভ থাকলে শুধু পিন দিলেই হবে।", path });
    reminded++;
  }
  const { data: gone } = await s.from("content_subscriptions").update({ status: "PAST_DUE" }).eq("status", "ACTIVE").eq("auto_renew", true).lt("current_period_end", now.toISOString()).select("id");
  await s.from("content_subscriptions").update({ status: "CANCELLED" }).eq("status", "ACTIVE").eq("auto_renew", false).lt("current_period_end", now.toISOString());
  return { reminded, lapsed: gone?.length ?? 0 };
}
