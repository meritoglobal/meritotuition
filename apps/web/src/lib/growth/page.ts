import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DATA_LIVE } from "@/lib/data";
import { me, type Me } from "./people";
import { attachReferral, REF_COOKIE } from "./referral";

/** For pages: the signed-in person, or off to login and back. */
export async function mustMe(next: string): Promise<Me> {
  const m = await me();
  if (!m) redirect(`/login?next=${encodeURIComponent(next)}`);
  return m;
}

/** If they arrived through a friend's link, record it once they are signed in. */
export async function claimReferral(email: string) {
  if (!DATA_LIVE) return;
  const jar = await cookies();
  const ref = jar.get(REF_COOKIE)?.value;
  if (!ref) return;
  await attachReferral(email, ref).catch(() => false);
}
