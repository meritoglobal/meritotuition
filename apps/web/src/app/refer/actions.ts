"use server";
import { revalidatePath } from "next/cache";
import { DATA_LIVE, db } from "@/lib/data";
import { me } from "@/lib/growth/people";
import { attachReferral } from "@/lib/growth/referral";

export type RefState = { ok?: boolean; error?: string } | null;

export async function applyCode(_: RefState, f: FormData): Promise<RefState> {
  const m = await me();
  if (!m || !DATA_LIVE) return { error: "off" };
  const ok = await attachReferral(m.email, String(f.get("code") ?? ""));
  revalidatePath("/refer");
  return ok ? { ok: true } : { error: "bad" };
}

export async function createCoupon(_: RefState, f: FormData): Promise<RefState> {
  const m = await me();
  if (!m?.admin || !DATA_LIVE) return { error: "forbidden" };
  const code = String(f.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
  const int = (k: string) => { const v = Number(f.get(k)); return Number.isInteger(v) && v > 0 ? v : null; };
  const percent = int("percent"), amount = int("amount"), max = int("max");
  const exp = String(f.get("expires") ?? "");
  if (!code || (!percent && !amount) || (percent && percent > 100)) return { error: "bad" };
  const { error } = await db().from("coupons").upsert({
    code, percent_off: amount ? null : percent, amount_off: amount, max_uses: max,
    expires_at: /^\d{4}-\d{2}-\d{2}$/.test(exp) ? new Date(`${exp}T23:59:59+06:00`).toISOString() : null, active: true,
  });
  if (error) return { error: "db" };
  revalidatePath("/refer");
  return { ok: true };
}

export async function toggleCoupon(code: string, active: boolean) {
  const m = await me();
  if (!m?.admin || !DATA_LIVE) return;
  await db().from("coupons").update({ active }).eq("code", code);
  revalidatePath("/refer");
}
