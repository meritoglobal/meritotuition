import "server-only";
import { db } from "@/lib/data";
import { notify } from "./notify";
import { startPayment } from "./pay";
import { isUuid } from "./people";

export interface Package {
  id: string; teacher_id: string; teacher_email: string | null; teacher_name: string | null; batch_id: string | null;
  title: string; subject: string; level: string; days_per_week: number; classes_per_month: number; price: number; active: boolean; created_at: string;
}
export interface Subscription {
  id: string; package_id: string; student_email: string; payer_email: string; status: "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELLED";
  auto_renew: boolean; agreement_id: string | null; payer_msisdn: string | null; current_period_end: string | null; created_at: string;
  packages: Package;
}

export async function browse(f: { subject?: string; level?: string; teacher?: string } = {}): Promise<Package[]> {
  let q = db().from("packages").select("*").eq("active", true).order("price").limit(60);
  if (f.subject) q = q.eq("subject", f.subject);
  if (f.level) q = q.eq("level", f.level);
  if (f.teacher) q = q.eq("teacher_id", f.teacher);
  const { data } = await q;
  return (data ?? []) as Package[];
}

export async function getPackage(id: string): Promise<Package | null> {
  if (!isUuid(id)) return null;
  const { data } = await db().from("packages").select("*").eq("id", id).maybeSingle();
  return (data as Package) ?? null;
}

export async function teacherPackages(teacherId: string): Promise<(Package & { active_subs: number })[]> {
  const { data } = await db().from("packages").select("*, subscriptions(status)").eq("teacher_id", teacherId).order("created_at", { ascending: false });
  return ((data ?? []) as (Package & { subscriptions: { status: string }[] })[]).map(({ subscriptions, ...p }) => ({ ...p, active_subs: subscriptions.filter((s) => s.status === "ACTIVE").length }));
}

const q = (v: string) => `"${v.replace(/["\\]/g, "")}"`;

export async function mySubscriptions(email: string): Promise<Subscription[]> {
  const { data } = await db().from("subscriptions").select("*, packages(*)").or(`student_email.eq.${q(email)},payer_email.eq.${q(email)}`).neq("status", "PENDING").order("created_at", { ascending: false });
  return (data ?? []) as Subscription[];
}

export async function getSubscription(id: string, email: string): Promise<Subscription | null> {
  if (!isUuid(id)) return null;
  const { data } = await db().from("subscriptions").select("*, packages(*)").eq("id", id).maybeSingle();
  const s = data as Subscription | null;
  return s && (s.payer_email === email || s.student_email === email) ? s : null;
}

/**
 * Start (or restart) a monthly package for a student; the payer may be a parent.
 * autoRenew saves the bKash wallet so later months are a single PIN.
 */
export async function subscribe(o: { pkg: Package; payer: string; student: string; autoRenew: boolean; coupon?: string }) {
  const s = db();
  const { data: existing } = await s.from("subscriptions").select("id,agreement_id,status").eq("package_id", o.pkg.id).eq("student_email", o.student).neq("status", "CANCELLED").maybeSingle();
  let subId = existing?.id as string | undefined;
  if (!subId) {
    const { data, error } = await s.from("subscriptions").insert({ package_id: o.pkg.id, student_email: o.student, payer_email: o.payer, auto_renew: o.autoRenew }).select("id").single();
    if (error) throw new Error("db");
    subId = data.id as string;
  } else {
    await s.from("subscriptions").update({ auto_renew: o.autoRenew, payer_email: o.payer }).eq("id", subId);
  }
  return startPayment({
    purpose: "PACKAGE", refId: subId, payer: o.payer, listPrice: o.pkg.price, coupon: o.coupon,
    saveWallet: o.autoRenew && !existing?.agreement_id, agreementId: o.autoRenew ? existing?.agreement_id : null,
  });
}

/** Pay next month for an existing subscription (saved wallet if there is one). */
export async function renew(sub: Subscription, payer: string, coupon?: string) {
  return startPayment({ purpose: "PACKAGE", refId: sub.id, payer, listPrice: sub.packages.price, coupon, agreementId: sub.auto_renew ? sub.agreement_id : null, saveWallet: sub.auto_renew && !sub.agreement_id });
}

export async function setAutoRenew(sub: Subscription, on: boolean) {
  await db().from("subscriptions").update({ auto_renew: on }).eq("id", sub.id);
}

export async function cancel(sub: Subscription) {
  await db().from("subscriptions").update({ status: "CANCELLED", auto_renew: false }).eq("id", sub.id);
  if (sub.packages.teacher_email) await notify({ email: sub.packages.teacher_email, kind: "PACKAGE_CANCELLED", title: "একজন ছাত্র পরের মাস নেবে না", body: `${sub.student_email} · ${sub.packages.title}`, path: "/teach/packages" });
}

/**
 * Daily job: remind payers 3 days before the month ends (auto-renew turns it
 * into a one-tap PIN), and mark months that ran out without payment.
 */
export async function renewalSweep(now = new Date()): Promise<{ reminded: number; lapsed: number }> {
  const s = db();
  const soon = new Date(now.getTime() + 3 * 86_400_000).toISOString();
  const { data: due } = await s.from("subscriptions").select("id,payer_email,auto_renew,current_period_end,packages(title,price)").eq("status", "ACTIVE").lte("current_period_end", soon).gt("current_period_end", now.toISOString());
  let reminded = 0;
  for (const d of due ?? []) {
    const p = d.packages as unknown as { title: string; price: number };
    const { count } = await s.from("app_notifications").select("id", { count: "exact", head: true }).eq("email", d.payer_email).eq("kind", "RENEW").eq("path", `/packages?renew=${d.id}`).gte("created_at", new Date(now.getTime() - 5 * 86_400_000).toISOString());
    if (count) continue;
    await notify({
      email: d.payer_email, kind: "RENEW", mail: true,
      title: `${p.title}: পরের মাসের টাকা দেওয়ার সময় হলো`,
      body: d.auto_renew ? `৳${p.price}। বিকাশ সেভ করা আছে, শুধু পিন দিলেই হবে।` : `৳${p.price}। বিকাশে দিয়ে দিন, ক্লাস যেন না থামে।`,
      path: `/packages?renew=${d.id}`,
    });
    reminded++;
  }
  const { data: gone } = await s.from("subscriptions").update({ status: "PAST_DUE" }).eq("status", "ACTIVE").lt("current_period_end", now.toISOString()).select("id,student_email,packages(title,teacher_email)");
  for (const g of gone ?? []) {
    const p = g.packages as unknown as { title: string; teacher_email: string | null };
    if (p.teacher_email) await notify({ email: p.teacher_email, kind: "PACKAGE_LAPSED", title: "এক ছাত্রের মাস শেষ, টাকা আসেনি", body: `${g.student_email} · ${p.title}`, path: "/teach/packages" });
  }
  return { reminded, lapsed: gone?.length ?? 0 };
}
