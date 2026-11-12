import { classAccess, denied } from "@/lib/class-access";
import { fail, json } from "@/lib/api";
import { DATA_LIVE, db } from "@/lib/data";
import { getExam, studentView } from "@/lib/exams";

export const dynamic = "force-dynamic";

/** GET: the paper. Tutors get the answer key; students get questions only, plus their submission. */
export async function GET(req: Request, ctx: { params: Promise<{ examId: string }> }) {
  if (!DATA_LIVE) return fail("data-off", 503);
  const e = await getExam((await ctx.params).examId);
  if (!e) return fail("not-found", 404);
  const v = await classAccess(req, e.class_id);
  if (denied(v)) return fail(v.error, v.error === "login" ? 401 : 403);
  if (v.role === "student" && !e.published) return fail("not-found", 404);
  const base = { id: e.id, classId: e.class_id, title: e.title, instructions: e.instructions, durationMin: e.duration_min, maxMarks: Number(e.max_marks), published: e.published };
  if (v.role === "teacher") return json({ role: "teacher", exam: { ...base, questions: e.questions } });
  const { data: sub } = await db().from("exam_submissions").select("answers,auto_score,manual,total,checked,submitted_at").eq("exam_id", e.id).eq("student_id", v.user.id).maybeSingle();
  // After submitting, the student may see the MCQ key to learn from mistakes.
  return json({ role: "student", exam: { ...base, questions: sub ? e.questions : studentView(e.questions) }, submission: sub });
}

/** PATCH (tutor): publish or unpublish. { published } */
export async function PATCH(req: Request, ctx: { params: Promise<{ examId: string }> }) {
  if (!DATA_LIVE) return fail("data-off", 503);
  const e = await getExam((await ctx.params).examId);
  if (!e) return fail("not-found", 404);
  const v = await classAccess(req, e.class_id);
  if (denied(v)) return fail(v.error, v.error === "login" ? 401 : 403);
  if (v.role !== "teacher") return fail("forbidden", 403);
  const b = (await req.json().catch(() => null)) as { published?: boolean } | null;
  const { error } = await db().from("exams").update({ published: Boolean(b?.published) }).eq("id", e.id);
  return error ? fail("db", 500) : json({ ok: true });
}
