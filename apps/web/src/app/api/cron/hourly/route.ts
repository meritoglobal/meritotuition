import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { releaseDue } from "@/lib/biz/earnings";
import { payoutSweep } from "@/lib/biz/payout";
import { expireChanges } from "@/lib/biz/schedule";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Every hour (Cloudflare cron in apps/web/worker.ts). Needs CRON_SECRET as `authorization: Bearer …`.
 * Pays tutors for classes held (commission kept), sends queued/auto bKash payouts,
 * and closes routine-change proposals that ran out of time.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return fail("forbidden", 403);
  if (!DATA_LIVE) return fail("data-off", 503);
  return json({
    release: await releaseDue().catch((e) => String(e)),
    payouts: await payoutSweep().catch((e) => String(e)),
    expiredChanges: await expireChanges().catch((e) => String(e)),
  });
}
