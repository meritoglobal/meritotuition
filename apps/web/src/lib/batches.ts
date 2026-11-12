import "server-only";
import { db } from "@/lib/data";

export interface Slot { day: number; time: string; minutes: number }
export interface Batch {
  id: string; teacher_id: string; title: string; subject: string; level: string; mode: "ONLINE" | "OFFLINE";
  capacity: number; fee: number | null; schedule: Slot[]; class_id: string; active: boolean; created_at: string;
}
export interface BatchWithCount extends Batch { students: number }
export interface Student { email: string; name: string | null; added_at: string }
export interface TeacherProfile {
  user_id: string; email: string | null; name: string; headline: string | null; bio: string | null;
  university: string | null; department: string | null; subjects: string[]; levels: string[];
  teaches_online: boolean; teaches_home: boolean; home_area: string | null; home_radius_km: number | null;
  price_online: number | null; price_home: number | null; phone: string | null; photo_path: string | null; updated_at: string;
}

export async function getProfile(userId: string): Promise<TeacherProfile | null> {
  const { data } = await db().from("teacher_profiles").select("*").eq("user_id", userId).maybeSingle();
  return (data as TeacherProfile) ?? null;
}

export async function teacherBatches(teacherId: string): Promise<BatchWithCount[]> {
  const { data } = await db().from("batches").select("*, batch_students(count)").eq("teacher_id", teacherId).order("created_at", { ascending: false });
  return ((data ?? []) as (Batch & { batch_students: { count: number }[] })[]).map(({ batch_students, ...b }) => ({ ...b, students: batch_students?.[0]?.count ?? 0 }));
}

export async function teacherBatch(id: string, teacherId: string): Promise<Batch | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("batches").select("*").eq("id", id).eq("teacher_id", teacherId).maybeSingle();
  return (data as Batch) ?? null;
}

export async function batchByClass(classId: string): Promise<(Batch & { teacher_name: string | null }) | null> {
  const { data } = await db().from("batches").select("*").eq("class_id", classId).maybeSingle();
  if (!data) return null;
  const p = await getProfile((data as Batch).teacher_id);
  return { ...(data as Batch), teacher_name: p?.name ?? null };
}

export async function batchStudents(batchId: string): Promise<Student[]> {
  const { data } = await db().from("batch_students").select("email,name,added_at").eq("batch_id", batchId).order("added_at");
  return (data ?? []) as Student[];
}

/** Batches a student is on, by their login email. */
export async function studentBatches(email: string): Promise<(Batch & { teacher_name: string | null })[]> {
  const { data: rows } = await db().from("batch_students").select("batch_id").eq("email", email.toLowerCase());
  const ids = (rows ?? []).map((r) => r.batch_id);
  if (!ids.length) return [];
  const { data } = await db().from("batches").select("*").in("id", ids).eq("active", true);
  const bs = (data ?? []) as Batch[];
  const { data: ps } = await db().from("teacher_profiles").select("user_id,name").in("user_id", [...new Set(bs.map((b) => b.teacher_id))]);
  return bs.map((b) => ({ ...b, teacher_name: ps?.find((p) => p.user_id === b.teacher_id)?.name ?? null }));
}

/** Exams in these classes that have scripts waiting for the tutor. */
export async function scriptsToCheck(classIds: string[]): Promise<number> {
  if (!classIds.length) return 0;
  const { data: exams } = await db().from("exams").select("id").in("class_id", classIds);
  const ids = (exams ?? []).map((e) => e.id);
  if (!ids.length) return 0;
  const { count } = await db().from("exam_submissions").select("id", { count: "exact", head: true }).in("exam_id", ids).eq("checked", false);
  return count ?? 0;
}

/** Next start time (Dhaka clock) for a weekly schedule, or null. */
export function nextClass(schedule: Slot[], now = new Date()): Date | null {
  const DHAKA = 6 * 60; // UTC+6, no DST
  const local = new Date(now.getTime() + DHAKA * 60_000);
  let best: Date | null = null;
  for (const s of schedule) {
    const [h, m] = s.time.split(":").map(Number);
    for (let add = 0; add <= 7; add++) {
      const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + add, h, m));
      if (d.getUTCDay() !== s.day) continue;
      const utc = new Date(d.getTime() - DHAKA * 60_000);
      // Still "next" until the class is over.
      if (utc.getTime() + (s.minutes || 60) * 60_000 <= now.getTime()) continue;
      if (!best || utc < best) best = utc;
      break;
    }
  }
  return best;
}
