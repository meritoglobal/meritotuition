import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { browse, mySubscriptions } from "@/lib/growth/packages";
import { me } from "@/lib/growth/people";
import { PAY_DEMO, PAY_ON } from "@/lib/growth/pay";
import { creditBalance } from "@/lib/growth/referral";

export const dynamic = "force-dynamic";

/** GET ?subject=&level=&teacher= → { mine, packages, credit, payments: { on, demo } } */
export async function GET(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const q = new URL(req.url).searchParams;
  const [mine, list, credit] = await Promise.all([
    mySubscriptions(m.email),
    browse({ subject: q.get("subject") ?? undefined, level: q.get("level") ?? undefined, teacher: q.get("teacher") ?? undefined }),
    creditBalance(m.email),
  ]);
  return json({ mine, packages: list, credit: Math.max(0, credit), payments: { on: PAY_ON, demo: PAY_DEMO } });
}
