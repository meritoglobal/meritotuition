import { classViewer } from "@/lib/class-access";
import { fail, json } from "@/lib/api";
import { DATA_LIVE, db } from "@/lib/data";
import { cleanAnswers, getExam, gradeExam } from "@/lib/exams";

export const dynamic = "force-dynamic";

/** POST (student) { answers }: one submission per student; MCQ is marked on the spot. */
export async function POST(req: Request, ctx: { params: Promise<{ examId: string }> }) {
  const v = await classViewer(req);
  if (!v) return fail("login", 401);
  if (v.role !== "student") return fail("forbidden", 403);
  if (!DATA_LIVE) return fail("data-off", 503);
  const e = await getExam((await ctx.params).examId);
  if (!e || !e.published) return fail("not-found", 404);
  const b = (await req.json().catch(() => null)) as { answers?: unknown } | null;
  const answers = cleanAnswers(e.questions, b?.answers);
  const r = gradeExam(e.questions, answers);
  const { error } = await db().from("exam_submissions").insert({
    exam_id: e.id, student_id: v.user.id, student_name: v.name, answers,
    auto_score: r.autoScore, manual: {}, total: r.total, checked: r.checked, checked_at: r.checked ? new Date().toISOString() : null,
  });
  if (error?.code === "23505") return fail("already", 409);
  return error ? fail("db", 500) : json({ autoScore: r.autoScore, total: r.total, maxMarks: r.maxMarks, checked: r.checked });
}
