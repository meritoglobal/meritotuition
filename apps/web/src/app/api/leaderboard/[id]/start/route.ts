import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { me } from "@/lib/growth/people";
import { startPayment } from "@/lib/growth/pay";
import { canTake, forStudent, getTest, isOpen, start } from "@/lib/growth/tests";

export const dynamic = "force-dynamic";

/** POST { name?, school? } → { endsAt, questions } (clock starts now), or { url } to pay first for a paid test. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const t = await getTest((await ctx.params).id);
  if (!t || !isOpen(t)) return fail("closed", 400);
  if (!(await canTake(t, m.email))) return json(await startPayment({ purpose: "TEST", refId: t.id, payer: m.email, listPrice: t.price }));
  const b = (await req.json().catch(() => ({}))) as { name?: string; school?: string };
  const a = await start(t, m.email, String(b.name ?? "").trim() || m.name, String(b.school ?? "").trim());
  return json({ endsAt: new Date(a.started_at).getTime() + t.duration_min * 60_000, questions: forStudent(t).questions, submitted: Boolean(a.submitted_at) });
}
