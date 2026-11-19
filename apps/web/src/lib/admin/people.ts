import "server-only";
import { db } from "@/lib/data";
import { OWNER_EMAILS, panelAdmins } from "./core";

export interface Account { id: string; email: string; created_at: string; last_sign_in_at: string | null; banned_until: string | null }
export interface Roles { tutor: boolean; verified: boolean; student: boolean; parent: boolean; blocked: boolean; admin: boolean }

/** Login accounts, newest first, optionally filtered by part of an email. */
export async function findAccounts(q: string, page: number, per = 50): Promise<{ rows: Account[]; total: number }> {
  const s = db();
  const { data, error } = await s.rpc("admin_find_users", { q, lim: per, off: page * per });
  if (!error) {
    const rows = (data ?? []) as (Account & { total: number })[];
    return { rows, total: Number(rows[0]?.total ?? 0) };
  }
  // admin.sql not run yet: fall back to the auth admin API (no server-side search).
  const { data: list } = await s.auth.admin.listUsers({ page: page + 1, perPage: per });
  const users = (list?.users ?? []).filter((u) => !q || (u.email ?? "").includes(q.toLowerCase()));
  return {
    rows: users.map((u) => ({ id: u.id, email: u.email ?? "", created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null, banned_until: (u as { banned_until?: string }).banned_until ?? null })),
    total: users.length,
  };
}

export async function getAccount(id: string): Promise<Account | null> {
  const { data } = await db().auth.admin.getUserById(id);
  const u = data?.user;
  if (!u) return null;
  return { id: u.id, email: (u.email ?? "").toLowerCase(), created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null, banned_until: (u as { banned_until?: string }).banned_until ?? null };
}

/** What each person is on the platform: tutor, student, parent, admin, blocked. */
export async function rolesOf(accounts: { id: string; email: string }[]): Promise<Map<string, Roles>> {
  const s = db();
  const emails = [...new Set(accounts.map((a) => a.email.toLowerCase()).filter(Boolean))];
  const ids = accounts.map((a) => a.id);
  const out = new Map<string, Roles>();
  if (!emails.length) return out;
  const [tp, bs, sub, gl, bl, admins] = await Promise.all([
    s.from("teacher_profiles").select("user_id,email,verified").or(`user_id.in.(${ids.join(",")}),email.in.(${emails.map((e) => `"${e.replace(/"/g, "")}"`).join(",")})`),
    s.from("batch_students").select("email").in("email", emails),
    s.from("subscriptions").select("student_email").in("student_email", emails),
    s.from("guardian_links").select("guardian_email").in("guardian_email", emails),
    s.from("account_blocks").select("email").in("email", emails),
    panelAdmins(),
  ]);
  const tutors = new Map<string, boolean>();
  for (const t of tp.data ?? []) { tutors.set(t.user_id, t.verified); if (t.email) tutors.set(String(t.email).toLowerCase(), t.verified); }
  const studs = new Set([...(bs.data ?? []).map((r) => r.email), ...(sub.data ?? []).map((r) => r.student_email)]);
  const parents = new Set((gl.data ?? []).map((r) => r.guardian_email));
  const blocked = new Set((bl.data ?? []).map((r) => r.email));
  for (const a of accounts) {
    const e = a.email.toLowerCase();
    const tv = tutors.has(a.id) ? tutors.get(a.id) : tutors.get(e);
    out.set(a.id, {
      tutor: tv !== undefined, verified: Boolean(tv), student: studs.has(e), parent: parents.has(e),
      blocked: blocked.has(e), admin: OWNER_EMAILS.includes(e) || admins.has(e),
    });
  }
  return out;
}
