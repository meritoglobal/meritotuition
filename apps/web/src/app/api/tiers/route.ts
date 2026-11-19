import { json } from "@/lib/api";
import { getSettings } from "@/lib/admin/settings";

/** GET → { tiers: [{ code, minStudents, rate, expertOnly, label }] } (public; for the "teach with us" screens). */
export async function GET() {
  const { tiers } = await getSettings();
  return json({ tiers: tiers.map((t) => ({ ...t, expertOnly: Boolean(t.expertOnly) })) });
}
