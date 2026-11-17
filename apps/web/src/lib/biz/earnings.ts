import "server-only";
import { nextRelease, nextTier, tierFor, unreleased, type Tier } from "@mastermoshai/core";
import { DATA_LIVE, db } from "@/lib/data";
import { notify } from "@/lib/growth/notify";
import { dhakaDay } from "@/lib/growth/people";

/**
 * Money flow: the student (or parent) pays a package upfront → one escrow lot per paid
 * month/batch → every class the tutor holds releases one class's share of each student's
 * lot → commission is kept, the rest lands in the tutor's wallet → the tutor withdraws to bKash.
 */

const DAY = 86_400_000;
/** A class counts once it has been running this long (and at least one student came). */
const SETTLE_AFTER_MIN = Number(process.env.SETTLE_AFTER_MIN ?? 40);

/** The tutor opened the class room: note that the class happened today. */
export async function recordSession(classId: string, teacherId: string) {
  if (!DATA_LIVE) return;
  const s = db();
  const { data: b } = await s.from("batches").select("id,teacher_id").eq("class_id", classId).maybeSingle();
  if (!b || b.teacher_id !== teacherId) return;
  await s.from("class_sessions").upsert({ class_id: classId, batch_id: b.id, teacher_id: teacherId, day: dhakaDay() }, { onConflict: "class_id,day", ignoreDuplicates: true });
}

/** A package payment came in: put it in escrow for that batch. */
export async function createLot(o: { paymentId: string; subscriptionId: string; periodFrom: Date; periodTo: Date }) {
  const s = db();
  const { data: sub } = await s.from("subscriptions").select("student_email, packages(teacher_id,teacher_email,batch_id,price,classes_per_month,billing)").eq("id", o.subscriptionId).maybeSingle();
  if (!sub) return;
  const p = sub.packages as unknown as { teacher_id: string; teacher_email: string | null; batch_id: string | null; price: number; classes_per_month: number; billing: string | null };
  await s.from("escrow_lots").upsert({
    payment_id: o.paymentId, subscription_id: o.subscriptionId, batch_id: p.batch_id, teacher_id: p.teacher_id, teacher_email: p.teacher_email,
    student_email: sub.student_email, gross: p.price, classes: p.classes_per_month,
    starts_at: o.periodFrom.toISOString(),
    ends_at: new Date(o.periodTo.getTime() + (p.billing === "BATCH" ? 30 : 7) * DAY).toISOString(),
  }, { onConflict: "payment_id", ignoreDuplicates: true });
}

export interface TierInfo { tier: Tier; students: number; expert: boolean; next: ReturnType<typeof nextTier> }

/** Lifetime paying students and the commission tier that gives. */
export async function tierOf(teacherId: string): Promise<TierInfo> {
  const s = db();
  const [{ data: lots }, { data: prof }] = await Promise.all([
    s.from("escrow_lots").select("student_email").eq("teacher_id", teacherId).limit(5000),
    s.from("teacher_profiles").select("expert").eq("user_id", teacherId).maybeSingle(),
  ]);
  const students = new Set((lots ?? []).map((l) => l.student_email)).size;
  const expert = Boolean(prof?.expert);
  return { tier: tierFor(students, expert), students, expert, next: nextTier(students, expert) };
}

interface LotRow { id: string; subscription_id: string; teacher_id: string; gross: number; classes: number; released: number; starts_at: string; ends_at: string; created_at: string }

/** Pay the tutor for one held class: one share from each paying student's lot. */
export async function releaseSession(sessionId: string, force = false): Promise<{ paid: number; students: number } | null> {
  const s = db();
  const { data: sess } = await s.from("class_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!sess || sess.status === "RELEASED" || !sess.batch_id) return null;
  const { count: came } = await s.from("class_attendance").select("email", { count: "exact", head: true }).eq("class_id", sess.class_id).eq("day", sess.day);
  if (!came && !force) {
    await s.from("class_sessions").update({ status: "EMPTY", students: 0 }).eq("id", sessionId).eq("status", "OPEN");
    return { paid: 0, students: 0 };
  }
  const at = sess.started_at as string;
  const { data: lots } = await s.from("escrow_lots").select("*").eq("batch_id", sess.batch_id).eq("status", "OPEN")
    .lte("created_at", at).gte("ends_at", at).order("created_at");
  const rate = (await tierOf(sess.teacher_id)).tier.rate;
  const seen = new Set<string>();
  let paid = 0;
  for (const l of (lots ?? []) as LotRow[]) {
    if (seen.has(l.subscription_id)) continue; // one share per student per class
    seen.add(l.subscription_id);
    const r = nextRelease(l, rate);
    if (!r) continue;
    const { data: ok } = await s.rpc("release_class", { lot: l.id, sess: sessionId, t: l.teacher_id, teacher_amt: r.teacher, commission_amt: r.commission, r: r.rate, is_last: r.lastOne });
    if (ok) paid += r.teacher;
  }
  await s.from("class_sessions").update({ status: "RELEASED", students: came ?? 0, released_at: new Date().toISOString() }).eq("id", sessionId);
  if (paid > 0) {
    const { data: t } = await s.from("teacher_profiles").select("email").eq("user_id", sess.teacher_id).maybeSingle();
    if (t?.email) await notify({ email: t.email, kind: "EARNING", title: `ক্লাসের টাকা জমা হলো: ৳${paid}`, body: "কমিশন কেটে ওয়ালেটে রাখা হয়েছে। চাইলে এখনই বিকাশে তুলে নিন।", path: "/teach/wallet" });
  }
  return { paid, students: came ?? 0 };
}

/** Cron + wallet page: settle every class that has run long enough. */
export async function releaseDue(now = new Date(), teacherId?: string): Promise<{ sessions: number; paid: number }> {
  const s = db();
  let q = s.from("class_sessions").select("id").eq("status", "OPEN").lte("started_at", new Date(now.getTime() - SETTLE_AFTER_MIN * 60_000).toISOString()).limit(200);
  if (teacherId) q = q.eq("teacher_id", teacherId);
  const { data } = await q;
  let paid = 0;
  for (const r of data ?? []) paid += (await releaseSession(r.id))?.paid ?? 0;
  return { sessions: data?.length ?? 0, paid };
}

/**
 * Lots whose time ran out with classes not held: the unused money goes back to the
 * payer as bonus credit (spent automatically on their next payment).
 */
export async function expireLots(now = new Date()): Promise<{ expired: number; refunded: number }> {
  const s = db();
  const { data } = await s.from("escrow_lots").select("*, subscriptions(payer_email)").eq("status", "OPEN").lt("ends_at", now.toISOString()).limit(200);
  let refunded = 0;
  for (const l of (data ?? []) as (LotRow & { subscriptions: { payer_email: string } })[]) {
    const left = unreleased(l);
    const { data: done } = await s.from("escrow_lots").update({ status: "EXPIRED" }).eq("id", l.id).eq("status", "OPEN").select("id").maybeSingle();
    if (!done || left <= 0) continue;
    await s.from("credits").insert({ email: l.subscriptions.payer_email, amount: left, reason: "UNUSED_CLASSES", ref: l.id });
    await notify({ email: l.subscriptions.payer_email, kind: "REFUND", title: `না-হওয়া ক্লাসের ৳${left} ফেরত`, body: "বোনাস হিসেবে জমা হয়েছে, পরের পেমেন্টে নিজে থেকে কেটে যাবে।", path: "/refer" });
    refunded += left;
  }
  return { expired: data?.length ?? 0, refunded };
}

export interface WalletView {
  balance: number; held: number; tier: TierInfo;
  entries: { id: number; amount: number; kind: string; gross: number | null; commission: number | null; rate: number | null; created_at: string }[];
  withdrawals: { id: string; amount: number; msisdn: string; status: string; trx_id: string | null; error: string | null; created_at: string }[];
  bkashNumber: string | null; autoPayout: boolean;
  totals: { earned: number; commission: number; withdrawn: number };
  emptyClasses: number;
}

export async function wallet(teacherId: string): Promise<WalletView> {
  const s = db();
  const [{ data: bal }, { data: entries }, { data: all }, { data: w }, { data: tw }, { data: open }, tier, { count: empty }] = await Promise.all([
    s.rpc("wallet_balance", { t: teacherId }),
    s.from("wallet_entries").select("id,amount,kind,gross,commission,rate,created_at").eq("teacher_id", teacherId).order("id", { ascending: false }).limit(50),
    s.from("wallet_entries").select("amount,kind,commission").eq("teacher_id", teacherId).limit(10000),
    s.from("withdrawals").select("id,amount,msisdn,status,trx_id,error,created_at").eq("teacher_id", teacherId).order("created_at", { ascending: false }).limit(20),
    s.from("teacher_wallets").select("bkash_number,auto_payout").eq("teacher_id", teacherId).maybeSingle(),
    s.from("escrow_lots").select("gross,classes,released").eq("teacher_id", teacherId).eq("status", "OPEN"),
    tierOf(teacherId),
    s.from("class_sessions").select("id", { count: "exact", head: true }).eq("teacher_id", teacherId).eq("status", "EMPTY"),
  ]);
  const totals = { earned: 0, commission: 0, withdrawn: 0 };
  for (const e of all ?? []) {
    if (e.kind === "EARNING") { totals.earned += e.amount; totals.commission += e.commission ?? 0; }
    if (e.kind === "WITHDRAWAL") totals.withdrawn -= e.amount;
    if (e.kind === "REVERSAL") totals.withdrawn -= e.amount;
  }
  const held = (open ?? []).reduce((a, l) => a + Math.round(unreleased(l) * (1 - tier.tier.rate)), 0);
  return {
    balance: Number(bal ?? 0), held, tier, entries: (entries ?? []) as WalletView["entries"], withdrawals: (w ?? []) as WalletView["withdrawals"],
    bkashNumber: tw?.bkash_number ?? null, autoPayout: Boolean(tw?.auto_payout), totals, emptyClasses: empty ?? 0,
  };
}
