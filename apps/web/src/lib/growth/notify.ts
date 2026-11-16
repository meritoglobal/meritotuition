import "server-only";
import { DATA_LIVE, db } from "@/lib/data";

/**
 * In-app notification (the app shows these and opens `path` on tap), plus an
 * email when RESEND_API_KEY and MAIL_FROM are set. Never throws.
 */
export async function notify(n: { email: string; kind: string; title: string; body?: string; path?: string; mail?: boolean }) {
  if (!DATA_LIVE) return;
  try {
    await db().from("app_notifications").insert({ email: n.email, kind: n.kind, title: n.title, body: n.body ?? null, path: n.path ?? null });
    if (n.mail) await sendMail(n.email, n.title, `${n.body ?? ""}${n.path ? `\n\n${SITE}${n.path}` : ""}`);
  } catch (e) {
    console.error("[notify]", e);
  }
}

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mastermoshai.net").replace(/\/$/, "");

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  if (!key || !from || !to.includes("@")) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, ...(html ? { html } : {}) }),
  }).catch(() => null);
  return Boolean(r?.ok);
}
