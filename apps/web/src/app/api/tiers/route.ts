import { COMMISSION_TIERS } from "@mastermoshai/core";
import { json } from "@/lib/api";

/** GET → { tiers: [{ code, minStudents, rate, expertOnly, label }] } (public; for the "teach with us" screens). */
export function GET() {
  return json({ tiers: COMMISSION_TIERS.map((t) => ({ ...t, expertOnly: Boolean(t.expertOnly) })) });
}
