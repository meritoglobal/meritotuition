import { classAccess, denied } from "@/lib/class-access";
import { fail, json } from "@/lib/api";
import { DATA_LIVE, db } from "@/lib/data";
import { getExam, gradeExam, type ExamAnswers } from "@/lib/exams";

export const dynamic = "force-dynamic";

/** POST (tutor) { marks: { questionId: number } }: mark written answers. */
export async function POST(req: Request, ctx: { params: Promise<{ examId: string; sid: string }> }) {
  if (!DATA_LIVE) return fail("data-off", 503);
  const { examId, sid } = await ctx.params;
  const e = await getExam(examId);
  if (!e) return fail("not-found", 404);
  const v = await classAccess(req, e.class_id);
  if (denied(v)) return fail(v.error, v.error === "login" ? 401 : 403);
  if (v.role !== "teacher") return fail("forbidden", 403);
  const s = db();
  const { data: sub } = await s.from("exam_submissions").select("answers").eq("id", sid).eq("exam_id", e.id).maybeSingle();
  if (!sub) return fail("not-found", 404);
  const b = (await req.json().catch(() => null)) as { marks?: Record<string, unknown> } | null;
  const marks: Record<string, number> = {};
  for (const [k, val] of Object.entries(b?.marks ?? {})) if (typeof val === "number" && Number.isFinite(val)) marks[k] = val;
  const r = gradeExam(e.questions, sub.answers as ExamAnswers, marks);
  const { error } = await s.from("exam_submissions").update({
    manual: r.manual, total: r.total, checked: r.checked, checked_at: r.checked ? new Date().toISOString() : null,
  }).eq("id", sid);
  return error ? fail("db", 500) : json(r);
}
