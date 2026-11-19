import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { myChanges, upcomingOverrides } from "@/lib/biz/schedule";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/**
 * Student side. GET → { changes: [{ id, kind, status, new_schedule, from_at, to_at, minutes, note, required, votes, batch, expires_at }], pending, moved }
 * pending = proposals still waiting for this student's answer.
 */
export async function GET() {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const changes = await myChanges(m.email);
  const pending = changes.filter((c) => c.status === "PENDING" && !(c.votes ?? []).some((v) => v.email === m.email)).length;
  const moved = await upcomingOverrides([...new Set(changes.filter((c) => c.status === "APPROVED" && c.kind === "RESCHEDULE").map((c) => c.batch_id))]);
  return json({ changes, pending, moved });
}
