import { fail, json } from "@/lib/api";
import { getProfile } from "@/lib/batches";
import { DATA_LIVE } from "@/lib/data";
import { PAY_ON, startPayment } from "@/lib/growth/pay";
import { me } from "@/lib/growth/people";
import { PRO_PRICE, proUntil } from "@/lib/growth/pro";

export const dynamic = "force-dynamic";

/** GET → { pro, until, price, payments } (tutor) */
export async function GET() {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const until = await proUntil(m.user.id);
  return json({ pro: Boolean(until && until > new Date()), until, price: PRO_PRICE, payments: PAY_ON });
}

/** POST { coupon? } → { url } : open it in the WebView to pay with bKash; it returns to /teach/pro?paid=1 */
export async function POST(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  if (!PAY_ON) return fail("payments-off", 503);
  if (!(await getProfile(m.user.id))) return fail("no-profile", 403);
  const b = (await req.json().catch(() => ({}))) as { coupon?: unknown };
  const { url } = await startPayment({ purpose: "PRO", refId: m.user.id, payer: m.email, listPrice: PRO_PRICE, coupon: typeof b.coupon === "string" ? b.coupon : undefined });
  return json({ url });
}
