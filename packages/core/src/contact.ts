/**
 * Login identifiers. Today we log in by email; when the SMS provider is ready we
 * switch to Bangladeshi mobile numbers. Both go through these normalisers so the
 * web, app and API agree on one format.
 */

/** "  Rafi@Gmail.COM " -> "rafi@gmail.com"; null if it does not look like an email. */
export function normalizeEmail(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(s) ? s : null;
}

/**
 * Accepts 01712345678, 8801712345678, +880 1712-345678 ...
 * Returns E.164 "+8801712345678", or null for anything that is not a BD mobile.
 */
export function normalizeBdPhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-()]/g, "");
  const m = /^(?:\+?88)?(01[3-9]\d{8})$/.exec(digits);
  return m ? `+88${m[1]}` : null;
}

/** OTP codes are digits only; Supabase sends 6 by default (6-10 allowed). */
export function cleanOtp(raw: string): string | null {
  const s = raw.replace(/\s/g, "");
  return /^\d{6,10}$/.test(s) ? s : null;
}
