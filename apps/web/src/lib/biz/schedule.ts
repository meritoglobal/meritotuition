import "server-only";
import { changeOutcome, validSchedule, type ChangeStatus, type WeeklySlotLite } from "@mastermoshai/core";
import { batchStudents, type Batch } from "@/lib/batches";
import { db } from "@/lib/data";
import { notify } from "@/lib/growth/notify";
import { isUuid } from "@/lib/growth/people";

/** Routine changes and one-off reschedules: the tutor proposes, every student on the batch approves. */

export interface ScheduleChange {
  id: string; batch_id: string; teacher_id: string; kind: "ROUTINE" | "RESCHEDULE";
  new_schedule: WeeklySlotLite[] | null; from_at: string | null; to_at: string | null; minutes: number | null; note: string | null;
  required: string[]; status: ChangeStatus; created_at: string; decided_at: string | null; expires_at: string;
  votes?: { email: string; vote: "APPROVE" | "REJECT"; at: string }[];
  batch?: { title: string; subject: string; level: string; schedule: WeeklySlotLite[] };
}

export type ProposeError = "bad" | "past" | "db";

export async function propose(b: Batch, o: { kind: "ROUTINE" | "RESCHEDULE"; schedule?: unknown; fromAt?: string; toAt?: string; minutes?: number; note?: string }): Promise<{ change: ScheduleChange } | { error: ProposeError }> {
  const now = Date.now();
  let row: Record<string, unknown>;
  if (o.kind === "ROUTINE") {
    const sched = validSchedule(o.schedule);
    if (!sched) return { error: "bad" };
    row = { kind: "ROUTINE", new_schedule: sched, expires_at: new Date(now + 7 * 86_400_000).toISOString() };
  } else {
    const from = new Date(o.fromAt ?? ""), to = new Date(o.toAt ?? "");
    const minutes = Number(o.minutes ?? 60);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || !Number.isInteger(minutes) || minutes < 15 || minutes > 300) return { error: "bad" };
    if (to.getTime() < now || from.getTime() < now - 3600_000) return { error: "past" };
    // The proposal lapses when the original class time comes (or the new one, whichever is first).
    row = { kind: "RESCHEDULE", from_at: from.toISOString(), to_at: to.toISOString(), minutes, expires_at: new Date(Math.min(from.getTime(), to.getTime())).toISOString() };
  }
  const students = (await batchStudents(b.id)).map((s) => s.email.toLowerCase());
  const { data, error } = await db().from("schedule_changes").insert({ ...row, batch_id: b.id, teacher_id: b.teacher_id, note: o.note?.trim().slice(0, 300) || null, required: students }).select("*").single();
  if (error || !data) return { error: "db" };
  const ch = data as ScheduleChange;
  if (!students.length) await decide(ch, "APPROVED");
  else for (const e of students) await notify({ email: e, kind: "SCHEDULE_CHANGE", mail: true, title: o.kind === "ROUTINE" ? `${b.title}: নতুন রুটিনের প্রস্তাব` : `${b.title}: একটা ক্লাস সরানোর প্রস্তাব`, body: "তোমার হ্যাঁ/না লাগবে। সবাই রাজি হলে তবেই বদলাবে।", path: "/routine" });
  return { change: (await getChange(ch.id))! };
}

export async function getChange(id: string): Promise<ScheduleChange | null> {
  if (!isUuid(id)) return null;
  const { data } = await db().from("schedule_changes").select("*, votes:schedule_votes(email,vote,at), batch:batches(title,subject,level,schedule)").eq("id", id).maybeSingle();
  return (data as ScheduleChange) ?? null;
}

export async function batchChanges(batchId: string): Promise<ScheduleChange[]> {
  const { data } = await db().from("schedule_changes").select("*, votes:schedule_votes(email,vote,at)").eq("batch_id", batchId).order("created_at", { ascending: false }).limit(20);
  return (data ?? []) as ScheduleChange[];
}

/** Proposals waiting for (or recently decided by) this student. */
export async function myChanges(email: string): Promise<ScheduleChange[]> {
  const { data } = await db().from("schedule_changes").select("*, votes:schedule_votes(email,vote,at), batch:batches(title,subject,level,schedule)")
    .contains("required", [email]).gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()).order("created_at", { ascending: false }).limit(30);
  return (data ?? []) as ScheduleChange[];
}

export async function pendingFor(email: string): Promise<number> {
  const { data } = await db().from("schedule_changes").select("id, votes:schedule_votes(email)").contains("required", [email]).eq("status", "PENDING");
  return (data ?? []).filter((c) => !(c.votes as { email: string }[]).some((v) => v.email === email)).length;
}

export async function vote(ch: ScheduleChange, email: string, v: "APPROVE" | "REJECT"): Promise<ScheduleChange | { error: "closed" | "not-yours" }> {
  if (ch.status !== "PENDING" || new Date(ch.expires_at) < new Date()) return { error: "closed" };
  if (!ch.required.includes(email)) return { error: "not-yours" };
  await db().from("schedule_votes").upsert({ change_id: ch.id, email, vote: v, at: new Date().toISOString() }, { onConflict: "change_id,email" });
  const fresh = (await getChange(ch.id))!;
  const out = changeOutcome(fresh.required, fresh.votes ?? []);
  if (out !== "PENDING") await decide(fresh, out);
  return (await getChange(ch.id))!;
}

export async function cancelChange(ch: ScheduleChange) {
  if (ch.status === "PENDING") await db().from("schedule_changes").update({ status: "CANCELLED", decided_at: new Date().toISOString() }).eq("id", ch.id).eq("status", "PENDING");
}

async function decide(ch: ScheduleChange, out: "APPROVED" | "REJECTED") {
  const s = db();
  const { data: won } = await s.from("schedule_changes").update({ status: out, decided_at: new Date().toISOString() }).eq("id", ch.id).eq("status", "PENDING").select("id").maybeSingle();
  if (!won) return;
  if (out === "APPROVED") {
    if (ch.kind === "ROUTINE" && ch.new_schedule) await s.from("batches").update({ schedule: ch.new_schedule }).eq("id", ch.batch_id);
    if (ch.kind === "RESCHEDULE" && ch.from_at && ch.to_at) await s.from("class_overrides").insert({ batch_id: ch.batch_id, cancelled_at: ch.from_at, moved_to: ch.to_at, minutes: ch.minutes ?? 60, change_id: ch.id });
  }
  const { data: t } = await s.from("teacher_profiles").select("email").eq("user_id", ch.teacher_id).maybeSingle();
  const { data: b } = await s.from("batches").select("title").eq("id", ch.batch_id).maybeSingle();
  const title = out === "APPROVED" ? `${b?.title ?? "ব্যাচ"}: সবাই রাজি, রুটিন বদলে গেছে` : `${b?.title ?? "ব্যাচ"}: প্রস্তাবে একজন রাজি নয়, আগের রুটিনই থাকছে`;
  if (t?.email) await notify({ email: t.email, kind: "SCHEDULE_DECIDED", title, path: `/teach/batches/${ch.batch_id}` });
  for (const e of ch.required) await notify({ email: e, kind: "SCHEDULE_DECIDED", title, path: "/routine" });
}

/** Cron: proposals nobody finished deciding in time. */
export async function expireChanges(now = new Date()): Promise<number> {
  const { data } = await db().from("schedule_changes").update({ status: "EXPIRED", decided_at: now.toISOString() }).eq("status", "PENDING").lt("expires_at", now.toISOString()).select("id");
  return data?.length ?? 0;
}

/** Approved one-off moves for these batches that are still ahead. */
export async function upcomingOverrides(batchIds: string[]): Promise<{ batch_id: string; cancelled_at: string; moved_to: string; minutes: number }[]> {
  if (!batchIds.length) return [];
  const { data } = await db().from("class_overrides").select("batch_id,cancelled_at,moved_to,minutes").in("batch_id", batchIds).gte("moved_to", new Date(Date.now() - 3 * 3600_000).toISOString()).order("moved_to");
  return data ?? [];
}
