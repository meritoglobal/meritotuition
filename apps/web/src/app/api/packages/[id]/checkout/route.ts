import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { getPackage, subscribe } from "@/lib/growth/packages";
import { isEmail, me } from "@/lib/growth/people";
import { PAY_ON, quote } from "@/lib/growth/pay";

export const dynamic = "force-dynamic";

/** POST { childEmail?, autoRenew?, coupon?, preview? } → { quote } with preview, else { url } to open for bKash. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE || !PAY_ON) return fail("off", 503);
  const pkg = await getPackage((await ctx.params).id);
  if (!pkg?.active) return fail("not-found", 404);
  const b = (await req.json().catch(() => ({}))) as { childEmail?: string; autoRenew?: boolean; coupon?: string; preview?: boolean };
  const coupon = String(b.coupon ?? "").trim();
  const q = await quote(m.email, pkg.price, coupon);
  if (b.preview) return json({ quote: q });
  if (!q.couponOk) return fail("bad-coupon", 400);
  const student = b.childEmail ? String(b.childEmail).trim().toLowerCase() : m.email;
  if (!isEmail(student) && student !== m.email) return fail("bad-email", 400);
  return json(await subscribe({ pkg, payer: m.email, student, autoRenew: b.autoRenew !== false, coupon }));
}
