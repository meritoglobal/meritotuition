import { isSegment } from "@mastermoshai/core";
import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { CONTENT_PRICE, SegmentLocked, subscribeSegment } from "@/lib/biz/content-subs";
import { isEmail, me } from "@/lib/growth/people";
import { PAY_ON, quote } from "@/lib/growth/pay";

export const dynamic = "force-dynamic";

/** POST { segment, childEmail?, autoRenew?, coupon?, preview? } → { quote } with preview, else { url } to open for bKash. 409 { error: "segment-locked", segment } when the student is fixed to another class. */
export async function POST(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE || !PAY_ON) return fail("off", 503);
  const b = (await req.json().catch(() => ({}))) as { segment?: string; childEmail?: string; autoRenew?: boolean; coupon?: string; preview?: boolean };
  if (!isSegment(b.segment)) return fail("bad-segment", 400);
  const coupon = String(b.coupon ?? "").trim();
  const q = await quote(m.email, CONTENT_PRICE, coupon);
  if (b.preview) return json({ quote: q });
  if (!q.couponOk) return fail("bad-coupon", 400);
  const student = b.childEmail ? String(b.childEmail).trim().toLowerCase() : m.email;
  if (!isEmail(student) && student !== m.email) return fail("bad-email", 400);
  try {
    return json(await subscribeSegment({ segment: b.segment, payer: m.email, student, autoRenew: b.autoRenew !== false, coupon }));
  } catch (e) {
    if (e instanceof SegmentLocked) return json({ error: "segment-locked", segment: e.segment }, 409);
    throw e;
  }
}
