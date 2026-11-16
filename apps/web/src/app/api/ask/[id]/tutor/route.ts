import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { askTutor, getDoubt } from "@/lib/growth/ask";
import { me } from "@/lib/growth/people";
import { PAY_ON } from "@/lib/growth/pay";

export const dynamic = "force-dynamic";

/** POST { coupon? } → { url }: open it to pay; the question then goes to tutors. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE || !PAY_ON) return fail("off", 503);
  const d = await getDoubt((await ctx.params).id);
  if (!d || d.asker_email !== m.email || !["AI", "WAITING_PAYMENT"].includes(d.status)) return fail("not-found", 404);
  const b = (await req.json().catch(() => ({}))) as { coupon?: string };
  return json(await askTutor(d, m.email, b.coupon));
}
