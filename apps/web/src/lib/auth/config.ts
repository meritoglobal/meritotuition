/**
 * Login settings, read from env at build time.
 *
 * NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or the older
 * NEXT_PUBLIC_SUPABASE_ANON_KEY) switch on real Supabase login. Without them the
 * site runs in demo mode: any email works and the code is always DEMO_CODE.
 *
 * NEXT_PUBLIC_OTP_CHANNEL: "email" (today) or "phone" (once the SMS provider is
 * connected in Supabase). Nothing else needs to change to switch.
 */
export type OtpChannel = "email" | "phone";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const AUTH_LIVE = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const OTP_CHANNEL: OtpChannel = process.env.NEXT_PUBLIC_OTP_CHANNEL === "phone" ? "phone" : "email";

export const DEMO_COOKIE = "mm_demo_user";
export const DEMO_CODE = "123456";

/** Pages that need a signed-in user. */
export const PROTECTED_PREFIXES = ["/dashboard", "/book", "/class"];
export const AFTER_LOGIN = "/dashboard/student";

/** Only allow same-site relative redirects after login. */
export function safeNext(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/login") ? s : AFTER_LOGIN;
}
