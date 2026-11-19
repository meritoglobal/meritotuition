import "server-only";
import { getUser, type SessionUser } from "@/lib/auth/session";
import { DATA_LIVE, db } from "@/lib/data";

export interface Me { user: SessionUser; email: string; name: string; admin: boolean }

/** The key we use for a person everywhere in these features: their login email, lower case. */
export const keyOf = (u: SessionUser) => (u.email ?? u.phone ?? u.id).trim().toLowerCase();
export const shortName = (email: string) => email.split("@")[0]!.slice(0, 40);

const ADMINS = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
export const isAdmin = (email: string) => ADMINS.includes(email.toLowerCase());

/** Signed-in user with a usable key, or null. */
export async function me(): Promise<Me | null> {
  const user = await getUser();
  if (!user) return null;
  const email = keyOf(user);
  return { user, email, name: shortName(email), admin: isAdmin(email) };
}

/** A nicer name for someone: tutor profile name, batch list name, or the email's first part. */
export async function displayName(email: string): Promise<string> {
  if (!DATA_LIVE) return shortName(email);
  const s = db();
  const { data: t } = await s.from("teacher_profiles").select("name").eq("email", email).limit(1).maybeSingle();
  if (t?.name) return t.name;
  const { data: b } = await s.from("batch_students").select("name").eq("email", email).not("name", "is", null).limit(1).maybeSingle();
  return b?.name || shortName(email);
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/** Saturday that starts the Dhaka week containing `d`, as YYYY-MM-DD. */
export function weekStart(d = new Date()): string {
  const local = new Date(d.getTime() + 6 * 3600_000);
  const back = (local.getUTCDay() + 1) % 7; // Sat=6 -> 0, Sun=0 -> 1, ...
  const s = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - back));
  return s.toISOString().slice(0, 10);
}
export const dhakaDay = (d = new Date()) => new Date(d.getTime() + 6 * 3600_000).toISOString().slice(0, 10);

/** Random code from an alphabet without look-alike characters. */
export function code(len = 6, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
