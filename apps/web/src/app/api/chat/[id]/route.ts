import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { messages, send, thread } from "@/lib/growth/chat";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/** GET ?after=<message id> → { thread, messages } (marks the thread read). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const t = await thread((await ctx.params).id, m.email);
  if (!t) return fail("not-found", 404);
  const after = Number(new URL(req.url).searchParams.get("after")) || 0;
  return json({ thread: t, messages: await messages(t, m.email, after) });
}

/** POST { text } → { message }. Contact details are masked before saving. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const t = await thread((await ctx.params).id, m.email);
  if (!t) return fail("not-found", 404);
  const b = (await req.json().catch(() => null)) as { text?: string } | null;
  const msg = await send(t, m.email, String(b?.text ?? ""));
  return msg ? json({ message: msg }) : fail("bad", 400);
}
