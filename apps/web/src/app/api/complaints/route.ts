import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { complain, recentClasses } from "@/lib/biz/complaints";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/**
 * Student complaints about a class (within 48 hours).
 * GET → { classes: [{ sessionId, batchTitle, startedAt, lateMin, complaint: { reason, status, refund } | null }] }
 * POST { sessionId, reason: TEACHER_LATE|ENDED_EARLY|POOR_TEACHING|BEHAVIOUR|OTHER, details? }
 *   → { status: REFUNDED, refund } when the tutor was 15+ min late (half the class back as credit), else { status: REVIEW }
 *   errors: reason | class | late (window closed) | dup | db
 */
export async function GET() {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  return json({ classes: await recentClasses(m.email) });
}

export async function POST(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const b = (await req.json().catch(() => ({}))) as { sessionId?: string; reason?: string; details?: string };
  const r = await complain({ email: m.email, sessionId: String(b.sessionId ?? ""), reason: String(b.reason ?? ""), details: b.details });
  if ("error" in r) return fail(r.error, r.error === "dup" ? 409 : 400);
  return json(r);
}
