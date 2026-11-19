import { fail, json } from "@/lib/api";
import { getProfile } from "@/lib/batches";
import { DATA_LIVE } from "@/lib/data";
import { me } from "@/lib/growth/people";
import { AREAS, getPrefs, savePrefs } from "@/lib/growth/requests";

export const dynamic = "force-dynamic";

/** GET → { prefs, areas } (tutor's request filter; subjects/levels/area/radius come from the profile) */
export async function GET() {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  return json({ prefs: await getPrefs(m.user.id), areas: AREAS });
}

/** POST { open?, notify?, minBudget?, extraAreas? } → { prefs } */
export async function POST(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  if (!(await getProfile(m.user.id))) return fail("no-profile", 403);
  const b = (await req.json().catch(() => ({}))) as { open?: unknown; notify?: unknown; minBudget?: unknown; extraAreas?: unknown };
  const p = await getPrefs(m.user.id);
  await savePrefs({
    user_id: m.user.id,
    open: typeof b.open === "boolean" ? b.open : p.open,
    notify: typeof b.notify === "boolean" ? b.notify : p.notify,
    min_budget: b.minBudget === undefined ? p.min_budget : Number(b.minBudget) || null,
    extra_areas: Array.isArray(b.extraAreas) ? b.extraAreas.map(String) : p.extra_areas,
  });
  return json({ prefs: await getPrefs(m.user.id) });
}
