import "server-only";
import { db } from "@/lib/data";
import { studentBatches, type Batch } from "@/lib/batches";
import { code, weekStart } from "./people";

export interface ChildLink { student_email: string; student_id: string | null; student_name: string | null; weekly_email: boolean }

export async function children(guardian: string): Promise<ChildLink[]> {
  const { data } = await db().from("guardian_links").select("student_email,student_id,student_name,weekly_email").eq("guardian_email", guardian).order("created_at");
  return (data ?? []) as ChildLink[];
}

export async function guardiansOf(student: string): Promise<string[]> {
  const { data } = await db().from("guardian_links").select("guardian_email").eq("student_email", student);
  return (data ?? []).map((r) => r.guardian_email);
}

export async function isGuardianOf(guardian: string, student: string): Promise<boolean> {
  const { data } = await db().from("guardian_links").select("student_email").eq("guardian_email", guardian).eq("student_email", student).maybeSingle();
  return Boolean(data);
}

/** A fresh 6-character code the student gives to a parent. Valid 2 days. */
export async function newGuardianCode(student: string, studentId: string): Promise<string> {
  const s = db();
  await s.from("guardian_codes").delete().eq("student_email", student);
  const c = code(6, "23456789");
  await s.from("guardian_codes").insert({ code: c, student_email: student, student_id: studentId, expires_at: new Date(Date.now() + 2 * 86_400_000).toISOString() });
  return c;
}

export async function useGuardianCode(guardian: string, raw: string, name?: string): Promise<{ ok: true; student: string } | { ok: false; error: "bad" | "self" }> {
  const c = raw.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/\D/g, "");
  const s = db();
  const { data } = await s.from("guardian_codes").select("student_email,student_id,expires_at").eq("code", c).maybeSingle();
  if (!data || new Date(data.expires_at) < new Date()) return { ok: false, error: "bad" };
  if (data.student_email === guardian) return { ok: false, error: "self" };
  await s.from("guardian_links").upsert({ guardian_email: guardian, student_email: data.student_email, student_id: data.student_id, student_name: name || null });
  await s.from("guardian_codes").delete().eq("code", c);
  return { ok: true, student: data.student_email };
}

export interface WeeklyReport {
  student: string;
  week: string;                     // Saturday, YYYY-MM-DD
  batches: { id: string; title: string; subject: string; teacher: string | null; teacherEmail: string | null; planned: number; attended: number }[];
  exams: { title: string; total: number; max: number; checked: boolean; at: string }[];
  tests: { title: string; score: number; max: number; rank: number | null; at: string }[];
  notes: { batch: string; teacher: string | null; rating: number | null; note: string }[];
  attendedTotal: number;
  plannedTotal: number;
}

/** What happened in a student's week: classes planned vs joined, exam marks, model tests, tutor notes. */
export async function weeklyReport(student: string, studentId: string | null, week = weekStart()): Promise<WeeklyReport> {
  const s = db();
  const from = new Date(`${week}T00:00:00+06:00`);
  const to = new Date(from.getTime() + 7 * 86_400_000);
  const days = Array.from({ length: 7 }, (_, i) => new Date(from.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  const bs = await studentBatches(student);
  const teacherEmails = await teacherEmailMap(bs);
  const { data: att } = await s.from("class_attendance").select("class_id,day").eq("email", student).gte("day", days[0]).lte("day", days[6]);
  const batches = bs.map((b) => ({
    id: b.id, title: b.title, subject: b.subject, teacher: b.teacher_name, teacherEmail: teacherEmails.get(b.teacher_id) ?? null,
    planned: b.schedule.length,
    attended: (att ?? []).filter((a) => a.class_id === b.class_id).length,
  }));

  const ids = [studentId, `demo:${student}`].filter(Boolean) as string[];
  const { data: subs } = await s.from("exam_submissions").select("total,checked,submitted_at,exams(title,max_marks)")
    .in("student_id", ids).gte("submitted_at", from.toISOString()).lt("submitted_at", to.toISOString());
  const exams = (subs ?? []).map((x) => {
    const e = x.exams as unknown as { title: string; max_marks: number };
    return { title: e?.title ?? "", total: Number(x.total), max: Number(e?.max_marks ?? 0), checked: x.checked, at: x.submitted_at };
  });

  const { data: att2 } = await s.from("model_test_attempts").select("test_id,score,max_score,submitted_at,model_tests(title)")
    .eq("email", student).not("submitted_at", "is", null).gte("submitted_at", from.toISOString()).lt("submitted_at", to.toISOString());
  const tests = await Promise.all((att2 ?? []).map(async (a) => {
    const { count } = await s.from("model_test_attempts").select("email", { count: "exact", head: true }).eq("test_id", a.test_id).gt("score", a.score);
    return { title: (a.model_tests as unknown as { title: string })?.title ?? "", score: Number(a.score), max: Number(a.max_score), rank: count == null ? null : count + 1, at: a.submitted_at as string };
  }));

  const { data: ns } = await s.from("progress_notes").select("batch_id,rating,note").eq("student_email", student).eq("week_start", week);
  const notes = (ns ?? []).map((n) => {
    const b = bs.find((x) => x.id === n.batch_id);
    return { batch: b?.title ?? "", teacher: b?.teacher_name ?? null, rating: n.rating, note: n.note };
  });

  return {
    student, week, batches, exams, tests, notes,
    attendedTotal: batches.reduce((a, b) => a + b.attended, 0),
    plannedTotal: batches.reduce((a, b) => a + b.planned, 0),
  };
}

async function teacherEmailMap(bs: Batch[]): Promise<Map<string, string>> {
  const ids = [...new Set(bs.map((b) => b.teacher_id))];
  if (!ids.length) return new Map();
  const { data } = await db().from("teacher_profiles").select("user_id,email").in("user_id", ids);
  return new Map((data ?? []).filter((r) => r.email).map((r) => [r.user_id, r.email.toLowerCase()]));
}

/** Plain-text summary for email and WhatsApp. Bangla. */
export function reportText(r: WeeklyReport, name: string): string {
  const n = (x: number) => String(x).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]!);
  const lines = [`মাস্টারমশাই · ${name}-এর এই সপ্তাহ`, `ক্লাস: ${n(r.plannedTotal)}টির মধ্যে ${n(r.attendedTotal)}টিতে এসেছে`];
  for (const e of r.exams) lines.push(`পরীক্ষা "${e.title}": ${n(e.total)}/${n(e.max)}${e.checked ? "" : " (খাতা দেখা বাকি)"}`);
  for (const t of r.tests) lines.push(`মডেল টেস্ট "${t.title}": ${n(t.score)}/${n(t.max)}${t.rank ? `, র‍্যাংক ${n(t.rank)}` : ""}`);
  for (const x of r.notes) lines.push(`${x.teacher ?? "টিউটর"} (${x.batch}): ${x.note}`);
  if (!r.notes.length) lines.push("এই সপ্তাহে টিউটরের নোট এখনো আসেনি।");
  return lines.join("\n");
}
