import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { guardiansOf, newGuardianCode } from "@/lib/growth/parent";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/** Student side. GET → { guardians }; POST → { code } a fresh 6-digit code for a parent (2 days). */
export async function GET() {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  return json({ guardians: (await guardiansOf(m.email)).length });
}

export async function POST() {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  return json({ code: await newGuardianCode(m.email, m.user.id) });
}
