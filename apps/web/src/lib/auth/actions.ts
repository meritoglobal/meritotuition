"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cleanOtp, normalizeBdPhone, normalizeEmail } from "@mastermoshai/core";
import { AUTH_LIVE, DEMO_CODE, DEMO_COOKIE, OTP_CHANNEL, safeNext } from "./config";
import { supabaseServer } from "./supabase";

export type LoginError = "badId" | "badCode" | "wrongCode" | "rateLimit" | "off" | "unknown";
export interface LoginState {
  step: "id" | "code";
  id?: string;
  next?: string;
  error?: LoginError;
}

function errorOf(code: string | undefined): LoginError {
  if (!code) return "unknown";
  if (code.includes("rate_limit")) return "rateLimit";
  if (code === "otp_expired" || code === "invalid_credentials") return "wrongCode";
  if (code === "email_address_invalid") return "badId";
  if (code.endsWith("_disabled")) return "off";
  return "unknown";
}

/** Step 1: send a one-time code to the email (or phone, when the channel is switched). */
export async function sendCode(_: LoginState, form: FormData): Promise<LoginState> {
  const next = safeNext(form.get("next"));
  const raw = String(form.get("id") ?? "");
  const id = OTP_CHANNEL === "phone" ? normalizeBdPhone(raw) : normalizeEmail(raw);
  if (!id) return { step: "id", next, error: "badId" };
  if (!AUTH_LIVE) return { step: "code", id, next };

  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp(OTP_CHANNEL === "phone" ? { phone: id } : { email: id, options: { shouldCreateUser: true } });
  if (error) return { step: "id", next, error: errorOf(error.code) };
  return { step: "code", id, next };
}

/** Step 2: check the code, start the session, go where the visitor was headed. */
export async function verifyCode(_: LoginState, form: FormData): Promise<LoginState> {
  const next = safeNext(form.get("next"));
  const raw = String(form.get("id") ?? "");
  const id = OTP_CHANNEL === "phone" ? normalizeBdPhone(raw) : normalizeEmail(raw);
  if (!id) return { step: "id", next, error: "badId" };
  const token = cleanOtp(String(form.get("code") ?? ""));
  if (!token) return { step: "code", id, next, error: "badCode" };

  if (!AUTH_LIVE) {
    if (token !== DEMO_CODE) return { step: "code", id, next, error: "wrongCode" };
    (await cookies()).set(DEMO_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  } else {
    const sb = await supabaseServer();
    const { error } = await sb.auth.verifyOtp(OTP_CHANNEL === "phone" ? { phone: id, token, type: "sms" } : { email: id, token, type: "email" });
    if (error) return { step: "code", id, next, error: errorOf(error.code) };
  }
  redirect(next);
}

export async function signOut() {
  if (AUTH_LIVE) await (await supabaseServer()).auth.signOut();
  (await cookies()).delete(DEMO_COOKIE);
  redirect("/");
}
