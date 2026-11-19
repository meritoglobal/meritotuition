import { CLASS_SEGMENTS, CLASS_SEGMENT_LABEL, CONTENT_SEGMENTS, GROUPS, GROUP_LABEL, SEGMENT_LABEL, packClass, packGroup } from "@mastermoshai/core";
import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { accessContext, catalog } from "@/lib/biz/access";
import { CONTENT_PRICE, lockedSegment, myContentSubs } from "@/lib/biz/content-subs";
import { me } from "@/lib/growth/people";
import { PAY_DEMO, PAY_ON } from "@/lib/growth/pay";

export const dynamic = "force-dynamic";

/**
 * GET ?class=SSC&group=SCIENCE&subject=Physics →
 * { price, classes, groups, packs: [{ code, class, group, label }], locked (the student's fixed pack or null), items: [{ id, kind, subject, level, segment, chapter, title, href, topics, access: { open, via, teacherName } }],
 *   access: { staff, segments, batches }, mine: ContentSub[], payments: { on, demo } }
 * A pack opens its class's common subjects + its own group's; a student is fixed to the class/group of their first pack.
 * access.via: "teacher" = free because the student studies that subject with a tutor here; "subscription" = ৳999 pack; "staff" = tutor/admin.
 */
export async function GET(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  const q = new URL(req.url).searchParams;
  const ctx = await accessContext(m);
  return json({
    price: CONTENT_PRICE,
    classes: CLASS_SEGMENTS.map((code) => ({ code, label: CLASS_SEGMENT_LABEL[code] })),
    groups: GROUPS.map((code) => ({ code, label: GROUP_LABEL[code] })),
    packs: CONTENT_SEGMENTS.map((code) => ({ code, class: packClass(code), group: packGroup(code), label: SEGMENT_LABEL[code] })),
    locked: DATA_LIVE ? await lockedSegment(m.email) : null,
    items: catalog(ctx, { segment: q.get("class") ?? undefined, group: q.get("group") ?? undefined, subject: q.get("subject") ?? undefined }),
    access: ctx,
    mine: DATA_LIVE ? await myContentSubs(m.email) : [],
    payments: { on: PAY_ON, demo: PAY_DEMO },
  });
}
