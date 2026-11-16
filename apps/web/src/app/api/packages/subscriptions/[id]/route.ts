import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { cancel, getSubscription, renew, setAutoRenew } from "@/lib/growth/packages";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/** POST { action: "renew" | "auto_on" | "auto_off" | "cancel" } → { ok } or { url } for renew. Payer only. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const sub = await getSubscription((await ctx.params).id, m.email);
  if (!sub || sub.payer_email !== m.email) return fail("not-found", 404);
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (action === "renew") return json(await renew(sub, m.email));
  if (action === "auto_on" || action === "auto_off") { await setAutoRenew(sub, action === "auto_on"); return json({ ok: true }); }
  if (action === "cancel") { await cancel(sub); return json({ ok: true }); }
  return fail("bad", 400);
}
