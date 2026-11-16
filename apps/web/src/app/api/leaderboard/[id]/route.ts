import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { me } from "@/lib/growth/people";
import { board, canTake, forStudent, getTest, isOpen, myAttempt } from "@/lib/growth/tests";

export const dynamic = "force-dynamic";

/**
 * GET → { test, open, canTake, attempt, endsAt, questions?, board }.
 * Questions (without answers) come only while my attempt is running; after submit they come with answers.
 */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!DATA_LIVE) return fail("data-off", 503);
  const t = await getTest((await ctx.params).id);
  if (!t?.published) return fail("not-found", 404);
  const m = await me();
  const [a, ranks] = await Promise.all([m ? myAttempt(t.id, m.email) : null, board(t.id, m?.email)]);
  const running = a && !a.submitted_at && isOpen(t);
  return json({
    test: { id: t.id, title: t.title, subject: t.subject, durationMin: t.duration_min, price: t.price, count: t.questions.length },
    open: isOpen(t), canTake: m ? await canTake(t, m.email) : false,
    attempt: a ? { startedAt: a.started_at, submittedAt: a.submitted_at, score: a.score, maxScore: a.max_score, timeSec: a.time_sec, answers: a.submitted_at ? a.answers : undefined } : null,
    endsAt: a ? new Date(a.started_at).getTime() + t.duration_min * 60_000 : null,
    questions: running ? forStudent(t).questions : a?.submitted_at ? t.questions : undefined,
    board: ranks,
  });
}
