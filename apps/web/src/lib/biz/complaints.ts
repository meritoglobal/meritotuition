import "server-only";
import { COMPLAINT_REASONS, LATE_COMPLAINT, complaintOpen, complaintRuling, halfBack, type ComplaintReason } from "@mastermoshai/core";
import { db } from "@/lib/data";
import { notify } from "@/lib/growth/notify";
import { isUuid } from "@/lib/growth/people";
import { releaseSession } from "./earnings";

/**
 * A late tutor is not cut on their own. If the student complains about that class
 * (within 48 hours) and the room log shows the tutor opened it 15+ minutes late, half of
 * that class's payment goes back to the payer as credit. Other complaints go to an admin.
 */

export interface RecentClass {
  sessionId: string; batchTitle: string; startedAt: string; lateMin: number | null;
  complaint: { reason: string; status: string; refund: number | null } | null;
}

/** Classes this student sat in during the last 48 hours, with any complaint already made. */
export async function recentClasses(email: string): Promise<RecentClass[]> {
  const s = db();
  const { data: rows } = await s.from("batch_students").select("batch_id").eq("email", email);
  const ids = (rows ?? []).map((r) => r.batch_id);
  if (!ids.length) return [];
  const since = new Date(Date.now() - LATE_COMPLAINT.windowHours * 3_600_000).toISOString();
  const { data: sess } = await s.from("class_sessions").select("id,class_id,day,started_at,late_min,batches(title)").in("batch_id", ids).gte("started_at", since).order("started_at", { ascending: false });
  if (!sess?.length) return [];
  const [{ data: att }, { data: mine }] = await Promise.all([
    s.from("class_attendance").select("class_id,day").eq("email", email).in("class_id", [...new Set(sess.map((x) => x.class_id))]),
    s.from("class_complaints").select("session_id,reason,status,refund").eq("student_email", email).in("session_id", sess.map((x) => x.id)),
  ]);
  return sess
    .filter((x) => att?.some((a) => a.class_id === x.class_id && a.day === x.day))
    .map((x) => {
      const c = mine?.find((m) => m.session_id === x.id);
      return {
        sessionId: x.id, batchTitle: (x.batches as unknown as { title: string } | null)?.title ?? "", startedAt: x.started_at, lateMin: x.late_min,
        complaint: c ? { reason: c.reason, status: c.status, refund: c.refund } : null,
      };
    });
}

export type ComplainError = "reason" | "class" | "late" | "dup" | "db";

export async function complain(o: { email: string; sessionId: string; reason: string; details?: string }): Promise<{ status: "REFUNDED" | "REVIEW"; refund: number } | { error: ComplainError }> {
  if (!COMPLAINT_REASONS.includes(o.reason as ComplaintReason)) return { error: "reason" };
  if (!isUuid(o.sessionId)) return { error: "class" };
  const s = db();
  const { data: sess } = await s.from("class_sessions").select("*").eq("id", o.sessionId).maybeSingle();
  if (!sess) return { error: "class" };
  const { count: inBatch } = await s.from("batch_students").select("batch_id", { count: "exact", head: true }).eq("batch_id", sess.batch_id).eq("email", o.email);
  const { count: came } = await s.from("class_attendance").select("email", { count: "exact", head: true }).eq("class_id", sess.class_id).eq("day", sess.day).eq("email", o.email);
  if (!inBatch || !came) return { error: "class" };
  if (!complaintOpen(new Date(sess.started_at))) return { error: "late" };
  const { data: row, error } = await s.from("class_complaints").insert({
    session_id: sess.id, batch_id: sess.batch_id, teacher_id: sess.teacher_id, student_email: o.email,
    reason: o.reason, details: o.details?.trim().slice(0, 1000) || null, late_min: sess.late_min,
  }).select("id").single();
  if (error) return { error: error.code === "23505" ? "dup" : "db" };
  if (complaintRuling(o.reason as ComplaintReason, sess.late_min) === "HALF_REFUND") {
    const refund = await refundHalf(row.id as string);
    if (refund !== null) return { status: "REFUNDED", refund };
  }
  return { status: "REVIEW", refund: 0 };
}

/** Give half of this student's share of that class back. Returns the amount, or null if there was nothing to take back. */
export async function refundHalf(complaintId: string, note?: string): Promise<number | null> {
  const s = db();
  const { data: c } = await s.from("class_complaints").select("*").eq("id", complaintId).maybeSingle();
  if (!c || c.status === "REFUNDED") return null;
  const { data: sess } = await s.from("class_sessions").select("id,status").eq("id", c.session_id).maybeSingle();
  if (sess?.status === "OPEN") await releaseSession(sess.id); // class still in progress: pay it out first, then take half back
  const { data: lots } = await s.from("escrow_lots").select("id, subscriptions(payer_email)").eq("batch_id", c.batch_id).eq("student_email", c.student_email);
  const refs = (lots ?? []).map((l) => `${l.id}:${c.session_id}`);
  if (!refs.length) return null;
  const { data: earn } = await s.from("wallet_entries").select("ref,gross,commission").eq("kind", "EARNING").in("ref", refs).limit(1).maybeSingle();
  if (!earn?.gross) return null;
  const lot = lots!.find((l) => earn.ref.startsWith(l.id as string));
  const payer = (lot?.subscriptions as unknown as { payer_email: string } | null)?.payer_email ?? c.student_email;
  const h = halfBack(earn.gross, earn.commission ?? 0);
  const { data: won } = await s.from("class_complaints").update({ status: "REFUNDED", refund: h.refund, note: note ?? null, decided_at: new Date().toISOString() })
    .eq("id", complaintId).neq("status", "REFUNDED").select("id").maybeSingle();
  if (!won) return null;
  await s.from("wallet_entries").upsert({ teacher_id: c.teacher_id, amount: -h.fromTutor, kind: "LATE_REFUND", ref: complaintId, gross: -h.refund, commission: -h.fromPlatform, note: `late ${c.late_min ?? "?"} min` }, { onConflict: "kind,ref", ignoreDuplicates: true });
  await s.from("credits").insert({ email: payer, amount: h.refund, reason: "LATE_REFUND", ref: complaintId });
  await notify({ email: payer, kind: "REFUND", mail: true, title: `দেরির নালিশে ৳${h.refund} ফেরত`, body: "বোনাস হিসেবে জমা হয়েছে, পরের পেমেন্টে নিজে থেকে কেটে যাবে।", path: "/refer" });
  const { data: t } = await s.from("teacher_profiles").select("email").eq("user_id", c.teacher_id).maybeSingle();
  if (t?.email) await notify({ email: t.email, kind: "LATE_REFUND", mail: true, title: `দেরির নালিশ: ৳${h.fromTutor} কাটা গেল`, body: `ক্লাসে ${c.late_min ?? "কয়েক"} মিনিট দেরিতে ঢুকেছিলেন, ছাত্র নালিশ করেছে। ওই ক্লাসের অর্ধেক টাকা ফেরত গেছে। সময়মতো ক্লাস শুরু করুন।`, path: "/teach/wallet" });
  return h.refund;
}

export interface ComplaintRow { id: string; student_email: string; teacher_id: string; reason: string; details: string | null; late_min: number | null; status: string; created_at: string }

export async function openComplaints(): Promise<ComplaintRow[]> {
  const { data } = await db().from("class_complaints").select("*").eq("status", "REVIEW").order("created_at").limit(100);
  return (data ?? []) as ComplaintRow[];
}

export async function rejectComplaint(id: string, note: string) {
  await db().from("class_complaints").update({ status: "REJECTED", note: note || null, decided_at: new Date().toISOString() }).eq("id", id).eq("status", "REVIEW");
}
