import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { cancelContent, getContentSub, renewContent, setContentAutoRenew } from "@/lib/biz/content-subs";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/** POST { action: "renew" } → { url } · { action: "auto", on } · { action: "cancel" } (payer only). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("off", 503);
  const sub = await getContentSub((await ctx.params).id, m.email);
  if (!sub) return fail("not-found", 404);
  if (sub.payer_email !== m.email) return fail("forbidden", 403);
  const b = (await req.json().catch(() => ({}))) as { action?: string; on?: boolean };
  if (b.action === "renew") return json(await renewContent(sub, m.email));
  if (b.action === "auto") { await setContentAutoRenew(sub, b.on !== false); return json({ ok: true }); }
  if (b.action === "cancel") { await cancelContent(sub); return json({ ok: true }); }
  return fail("bad-action", 400);
}
