import { cookies } from "next/headers";
import { AUTH_LIVE, DEMO_COOKIE } from "./config";
import { supabaseServer } from "./supabase";

export interface SessionUser {
  id: string;
  email?: string;
  phone?: string;
  demo: boolean;
}

/** The signed-in user, or null. Verified with Supabase on every call. */
export async function getUser(): Promise<SessionUser | null> {
  if (!AUTH_LIVE) {
    const v = (await cookies()).get(DEMO_COOKIE)?.value;
    return v ? { id: `demo:${v}`, email: v, demo: true } : null;
  }
  const { data } = await (await supabaseServer()).auth.getUser();
  const u = data.user;
  return u ? { id: u.id, email: u.email ?? undefined, phone: u.phone ?? undefined, demo: false } : null;
}
