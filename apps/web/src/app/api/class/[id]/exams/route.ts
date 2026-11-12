import { classViewer } from "@/lib/class-access";
import { fail, json } from "@/lib/api";
import { DATA_LIVE, db, safeClassId } from "@/lib/data";
import { cleanQuestions, gradeExam, validateExam } from "@/lib/exams";

export const dynamic = "force-dynamic";

/** GET: this class's exams. Students see published ones plus their own result. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const v = await classViewer(req);
  if (!v) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const id = safeClassId((await ctx.params).id);
  const s = db();
  let q = s.from("exams").select("id,title,duration_min,max_marks,published,created_at,questions").eq("class_id", id).order("created_at", { ascending: false });
  if (v.role === "student") q = q.eq("published", true);
  const { data: exams, error } = await q;
  if (error) return fail("db", 500);
  const ids = (exams ?? []).map((e) => e.id);
  const { data: subs } = ids.length
    ? v.role === "teacher"
      ? await s.from("exam_submissions").select("exam_id,checked").in("exam_id", ids)
      : await s.from("exam_submissions").select("exam_id,checked,total,auto_score").in("exam_id", ids).eq("student_id", v.user.id)
    : { data: [] };
  return json({
    role: v.role,
    exams: (exams ?? []).map((e) => {
      const mine = subs?.filter((x) => x.exam_id === e.id) ?? [];
      const kinds = new Set((e.questions as { kind: string }[]).map((x) => x.kind));
      return {
        id: e.id, title: e.title, durationMin: e.duration_min, maxMarks: Number(e.max_marks), published: e.published, at: e.created_at,
        count: (e.questions as unknown[]).length, kinds: [...kinds],
        ...(v.role === "teacher"
          ? { submitted: mine.length, toCheck: mine.filter((x) => !x.checked).length }
          : { mine: mine[0] ? { checked: mine[0].checked, total: Number((mine[0] as unknown as { total: number }).total) } : null }),
      };
    }),
  });
}

/** POST (tutor): create an exam. { title, instructions?, durationMin?, questions, publish } */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const v = await classViewer(req);
  if (!v) return fail("login", 401);
  if (v.role !== "teacher") return fail("forbidden", 403);
  if (!DATA_LIVE) return fail("data-off", 503);
  const id = safeClassId((await ctx.params).id);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = String(b?.title ?? "").trim().slice(0, 200);
  const questions = cleanQuestions(b?.questions);
  const errors = validateExam(questions);
  if (!title) errors.unshift("title");
  if (errors.length) return json({ error: "invalid", errors }, 400);
  const dur = Number(b?.durationMin);
  const { data, error } = await db().from("exams").insert({
    class_id: id, title, instructions: String(b?.instructions ?? "").slice(0, 4000) || null,
    duration_min: Number.isInteger(dur) && dur > 0 && dur <= 600 ? dur : null,
    questions, max_marks: gradeExam(questions, {}).maxMarks, published: Boolean(b?.publish), created_by: v.user.id,
  }).select("id").single();
  return error ? fail("db", 500) : json({ id: data.id });
}
