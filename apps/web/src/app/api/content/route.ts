import { CONTENT_SEGMENTS, SEGMENT_LABEL } from "@mastermoshai/core";
import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { accessContext, catalog } from "@/lib/biz/access";
import { CONTENT_PRICE, myContentSubs } from "@/lib/biz/content-subs";
import { me } from "@/lib/growth/people";
import { PAY_DEMO, PAY_ON } from "@/lib/growth/pay";

export const dynamic = "force-dynamic";

/**
 * GET ?segment=SSC&subject=Physics →
 * { price, segments: [{ code, label }], items: [{ id, kind, subject, level, segment, chapter, title, href, topics, access: { open, via, teacherName } }],
 *   access: { staff, segments, batches }, mine: ContentSub[], payments: { on, demo } }
 * access.via: "teacher" = free because the student studies that subject with a tutor here; "subscription" = ৳999 pack; "staff" = tutor/admin.
 */
export async function GET(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  const q = new URL(req.url).searchParams;
  const ctx = await accessContext(m);
  return json({
    price: CONTENT_PRICE,
    segments: CONTENT_SEGMENTS.map((code) => ({ code, label: SEGMENT_LABEL[code] })),
    items: catalog(ctx, { segment: q.get("segment") ?? undefined, subject: q.get("subject") ?? undefined }),
    access: ctx,
    mine: DATA_LIVE ? await myContentSubs(m.email) : [],
    payments: { on: PAY_ON, demo: PAY_DEMO },
  });
}
