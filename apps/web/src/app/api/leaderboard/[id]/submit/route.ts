import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { me } from "@/lib/growth/people";
import { board, getTest, myAttempt, submit } from "@/lib/growth/tests";

export const dynamic = "force-dynamic";

/** POST { answers: { q1: 0, q2: 3, ... } } → { score, maxScore, timeSec, rank, total } */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const t = await getTest((await ctx.params).id);
  if (!t) return fail("not-found", 404);
  const a = await myAttempt(t.id, m.email);
  if (!a) return fail("not-started", 400);
  const b = (await req.json().catch(() => ({}))) as { answers?: unknown };
  const done = await submit(t, a, b.answers);
  const r = await board(t.id, m.email, 1);
  return json({ score: Number(done.score), maxScore: Number(done.max_score), timeSec: done.time_sec, rank: r.mine?.rank ?? null, total: r.total });
}
