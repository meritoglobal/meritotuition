import { classViewer } from "@/lib/class-access";
import { fail, json } from "@/lib/api";
import { DATA_LIVE, db } from "@/lib/data";
import { getExam } from "@/lib/exams";

export const dynamic = "force-dynamic";

/** GET (tutor): every submission for this exam, with answers for checking. */
export async function GET(req: Request, ctx: { params: Promise<{ examId: string }> }) {
  const v = await classViewer(req);
  if (!v) return fail("login", 401);
  if (v.role !== "teacher") return fail("forbidden", 403);
  if (!DATA_LIVE) return fail("data-off", 503);
  const e = await getExam((await ctx.params).examId);
  if (!e) return fail("not-found", 404);
  const { data, error } = await db().from("exam_submissions").select("id,student_name,answers,auto_score,manual,total,checked,submitted_at").eq("exam_id", e.id).order("submitted_at");
  return error ? fail("db", 500) : json({ submissions: data });
}
