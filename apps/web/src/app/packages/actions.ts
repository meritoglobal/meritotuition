"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DATA_LIVE } from "@/lib/data";
import { cancel, getPackage, getSubscription, renew, setAutoRenew, subscribe } from "@/lib/growth/packages";
import { isEmail, me } from "@/lib/growth/people";
import { quote } from "@/lib/growth/pay";

export type BuyState = { error?: "login" | "off" | "badCoupon" | "badEmail" | "pay"; } | null;

export async function buy(pkgId: string, _: BuyState, f: FormData): Promise<BuyState> {
  const m = await me();
  if (!m) return { error: "login" };
  if (!DATA_LIVE) return { error: "off" };
  const pkg = await getPackage(pkgId);
  if (!pkg?.active) return { error: "pay" };
  const forChild = f.get("for") === "child";
  const student = forChild ? String(f.get("child") ?? "").trim().toLowerCase() : m.email;
  if (forChild && (!isEmail(student) || student === m.email)) return { error: "badEmail" };
  const coupon = String(f.get("coupon") ?? "").trim();
  if (coupon && !(await quote(m.email, pkg.price, coupon)).couponOk) return { error: "badCoupon" };
  let url: string;
  try {
    url = (await subscribe({ pkg, payer: m.email, student, autoRenew: f.get("auto") === "on", coupon })).url;
  } catch (e) {
    console.error("[buy]", e);
    return { error: "pay" };
  }
  redirect(url);
}

export async function renewSub(subId: string) {
  const m = await me();
  if (!m || !DATA_LIVE) return;
  const sub = await getSubscription(subId, m.email);
  if (!sub) return;
  const { url } = await renew(sub, m.email);
  redirect(url);
}

export async function autoRenew(subId: string, on: boolean) {
  const m = await me();
  if (!m || !DATA_LIVE) return;
  const sub = await getSubscription(subId, m.email);
  if (sub?.payer_email === m.email) await setAutoRenew(sub, on);
  revalidatePath("/packages");
}

export async function stopSub(subId: string) {
  const m = await me();
  if (!m || !DATA_LIVE) return;
  const sub = await getSubscription(subId, m.email);
  if (sub?.payer_email === m.email) await cancel(sub);
  revalidatePath("/packages");
}
