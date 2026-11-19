import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { cancelChange, getChange, vote } from "@/lib/biz/schedule";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/** POST { vote: "APPROVE" | "REJECT" } (a student on the batch) or { action: "cancel" } (the tutor) → { change } */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const ch = await getChange((await ctx.params).id);
  if (!ch) return fail("not-found", 404);
  const b = (await req.json().catch(() => ({}))) as { vote?: string; action?: string };
  if (b.action === "cancel") {
    if (ch.teacher_id !== m.user.id) return fail("forbidden", 403);
    await cancelChange(ch);
    return json({ change: await getChange(ch.id) });
  }
  if (b.vote !== "APPROVE" && b.vote !== "REJECT") return fail("bad-vote", 400);
  const r = await vote(ch, m.email, b.vote);
  return "error" in r ? fail(r.error, r.error === "closed" ? 409 : 403) : json({ change: r });
}
