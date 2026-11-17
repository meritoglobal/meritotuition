import { fail, json } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { browse } from "@/lib/growth/packages";
import { publicTutor } from "@/lib/growth/tutors";

export const dynamic = "force-dynamic";

/** GET → { tutor: PublicTutor, packages } (public; no phone or email) */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!DATA_LIVE) return fail("data-off", 503);
  const t = await publicTutor(decodeURIComponent((await params).id));
  if (!t) return fail("not-found", 404);
  const packages = (await browse({ teacher: t.id })).map(({ teacher_email: _e, ...p }) => p);
  return json({ tutor: t, packages });
}
