import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { me } from "@/lib/growth/people";
import { listTests, monthBoard } from "@/lib/growth/tests";

export const dynamic = "force-dynamic";

/** GET → { tests: [{ id, title, subject, questions (count), durationMin, price, takers }], month: Ranked[] } */
export async function GET() {
  if (!DATA_LIVE) return fail("data-off", 503);
  const m = await me();
  const [tests, month] = await Promise.all([listTests(), monthBoard(m?.email)]);
  return json({
    tests: tests.map((t) => ({ id: t.id, title: t.title, subject: t.subject, questions: t.questions.length, durationMin: t.duration_min, price: t.price, takers: t.takers, opensAt: t.opens_at, closesAt: t.closes_at })),
    month,
  });
}
