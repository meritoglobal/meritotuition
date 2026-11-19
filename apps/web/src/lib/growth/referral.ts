import "server-only";
import { db } from "@/lib/data";
import { code } from "./people";
import { notify } from "./notify";

export const REFERRAL_REWARD = Number(process.env.REFERRAL_REWARD ?? 200); // taka each, to both sides
export const REF_COOKIE = "mm_ref";

export async function myCode(email: string): Promise<string> {
  const s = db();
  const { data } = await s.from("referral_codes").select("code").eq("email", email).maybeSingle();
  if (data?.code) return data.code;
  for (let i = 0; i < 5; i++) {
    const c = code(6);
    const { error } = await s.from("referral_codes").insert({ email, code: c });
    if (!error) return c;
    const again = await s.from("referral_codes").select("code").eq("email", email).maybeSingle();
    if (again.data?.code) return again.data.code;
  }
  throw new Error("referral-code");
}

/** Record that `email` arrived through `refCode`. First code wins; your own code does nothing. */
export async function attachReferral(email: string, refCode: string): Promise<boolean> {
  const c = refCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (!c) return false;
  const s = db();
  const { data: owner } = await s.from("referral_codes").select("email").eq("code", c).maybeSingle();
  if (!owner || owner.email === email) return false;
  // Only new people: someone who already paid us is not a referral.
  const { count } = await s.from("payments").select("id", { count: "exact", head: true }).eq("payer_email", email).eq("status", "PAID");
  if (count) return false;
  const { error } = await s.from("referrals").insert({ referee_email: email, referrer_email: owner.email });
  return !error;
}

export async function creditBalance(email: string): Promise<number> {
  const { data } = await db().from("credits").select("amount").eq("email", email);
  return (data ?? []).reduce((a, r) => a + Number(r.amount), 0);
}

/** After someone's first paid package: both sides get the reward, once. */
export async function rewardReferral(email: string) {
  const s = db();
  const { data: r } = await s.from("referrals").update({ status: "REWARDED", rewarded_at: new Date().toISOString() })
    .eq("referee_email", email).eq("status", "JOINED").select("referrer_email").maybeSingle();
  if (!r) return;
  await s.from("credits").insert([
    { email, amount: REFERRAL_REWARD, reason: "REFERRAL_JOINED", ref: r.referrer_email },
    { email: r.referrer_email, amount: REFERRAL_REWARD, reason: "REFERRAL_FRIEND", ref: email },
  ]);
  await notify({ email: r.referrer_email, kind: "REFERRAL", title: `৳${REFERRAL_REWARD} বোনাস পেলেন!`, body: "আপনার আনা বন্ধু প্রথম মাস শুরু করেছে। বোনাসটা পরের পেমেন্টে নিজে থেকে কাটা যাবে।", path: "/refer" });
}

export interface Coupon { code: string; percent_off: number | null; amount_off: number | null; max_uses: number | null; used: number; expires_at: string | null; active: boolean }

export async function findCoupon(raw: string): Promise<Coupon | null> {
  const c = raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
  if (!c) return null;
  const { data } = await db().from("coupons").select("*").eq("code", c).maybeSingle();
  const k = data as Coupon | null;
  if (!k || !k.active) return null;
  if (k.expires_at && new Date(k.expires_at) < new Date()) return null;
  if (k.max_uses != null && k.used >= k.max_uses) return null;
  return k;
}

export const couponDiscount = (k: Coupon | null, price: number) =>
  !k ? 0 : Math.min(price, Math.round(k.amount_off ?? (price * (k.percent_off ?? 0)) / 100));
