import "server-only";
import { notFound } from "next/navigation";
import { DATA_LIVE, db } from "@/lib/data";
import { mustMe } from "@/lib/growth/page";
import { me, type Me } from "@/lib/growth/people";
import { panelAdmins } from "./roles";

export { panelAdmins, forgetAdmins, isBlocked, forgetBlock } from "./roles";

/** Owners from the ADMIN_EMAILS env var. They cannot be removed from the panel. */
export const OWNER_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export async function isAdminEmail(email: string): Promise<boolean> {
  const e = email.toLowerCase();
  return OWNER_EMAILS.includes(e) || (await panelAdmins()).has(e);
}

/** For admin pages: the signed-in admin, or a 404 for everyone else. */
export async function requireAdmin(path: string): Promise<Me> {
  const m = await mustMe(path);
  if (!DATA_LIVE || !(m.admin || (await isAdminEmail(m.email)))) notFound();
  return { ...m, admin: true };
}

/** For server actions: the admin, or null (the action then does nothing). */
export async function adminOrNull(): Promise<Me | null> {
  const m = await me();
  if (!m || !DATA_LIVE) return null;
  return m.admin || (await isAdminEmail(m.email)) ? { ...m, admin: true } : null;
}

/** Write one line to the admin log. Never throws. */
export async function audit(admin: string, action: string, target?: string | null, detail?: Record<string, unknown>) {
  try {
    await db().from("admin_log").insert({ admin_email: admin, action, target: target ?? null, detail: detail ?? null });
  } catch (e) {
    console.error("[admin-log]", e);
  }
}

export const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
export const int = (f: FormData, k: string) => {
  const n = Number(String(f.get(k) ?? "").trim());
  return Number.isFinite(n) ? Math.round(n) : NaN;
};
