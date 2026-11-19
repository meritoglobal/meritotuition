import "server-only";
import { DATA_LIVE, db } from "@/lib/data";

const TTL = 60_000;
let adminCache: { at: number; list: Set<string> } | null = null;

/** Admins added from the panel (admin_users), cached for a minute. */
export async function panelAdmins(): Promise<Set<string>> {
  if (!DATA_LIVE) return new Set();
  if (adminCache && Date.now() - adminCache.at < TTL) return adminCache.list;
  const { data, error } = await db().from("admin_users").select("email").limit(500);
  const list = new Set(error ? [] : (data ?? []).map((r) => String(r.email).toLowerCase()));
  adminCache = { at: Date.now(), list };
  return list;
}
export const forgetAdmins = () => { adminCache = null; };

const blockCache = new Map<string, { at: number; blocked: boolean }>();

/** True when this login (user id or email) is suspended. Cached for a minute per person. */
export async function isBlocked(userId: string, email?: string): Promise<boolean> {
  if (!DATA_LIVE) return false;
  const key = `${userId}|${email ?? ""}`;
  const hit = blockCache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.blocked;
  let blocked = false;
  try {
    const ors = [`user_id.eq.${userId}`];
    if (email) ors.push(`email.eq.${email.toLowerCase().replace(/[,()"]/g, "")}`);
    const { data, error } = await db().from("account_blocks").select("email").or(ors.join(",")).limit(1);
    blocked = !error && (data ?? []).length > 0;
  } catch {
    blocked = false;
  }
  if (blockCache.size > 5000) blockCache.clear();
  blockCache.set(key, { at: Date.now(), blocked });
  return blocked;
}
export const forgetBlock = () => blockCache.clear();

