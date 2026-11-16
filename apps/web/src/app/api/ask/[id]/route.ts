import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { getDoubt, imageUrl } from "@/lib/growth/ask";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/** GET → { question, imageUrl } for the asker or the tutor answering it. */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const d = await getDoubt((await ctx.params).id);
  if (!d || (d.asker_email !== m.email && d.tutor_email !== m.email)) return fail("not-found", 404);
  return json({ question: d, imageUrl: await imageUrl(d) });
}
