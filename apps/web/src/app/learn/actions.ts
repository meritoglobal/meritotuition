"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSegment } from "@mastermoshai/core";
import { DATA_LIVE } from "@/lib/data";
import { cancelContent, contentPrice, getContentSub, renewContent, setContentAutoRenew, subscribeSegment } from "@/lib/biz/content-subs";
import { isEmail, me } from "@/lib/growth/people";
import { quote } from "@/lib/growth/pay";
import type { BuyState } from "@/app/packages/actions";
import { SegmentLocked } from "@/lib/biz/content-subs";

export async function buySegment(segment: string, _: BuyState, f: FormData): Promise<BuyState> {
  const m = await me();
  if (!m) return { error: "login" };
  if (!DATA_LIVE || !isSegment(segment)) return { error: "off" };
  const forChild = f.get("for") === "child";
  const student = forChild ? String(f.get("child") ?? "").trim().toLowerCase() : m.email;
  if (forChild && (!isEmail(student) || student === m.email)) return { error: "badEmail" };
  const coupon = String(f.get("coupon") ?? "").trim();
  if (coupon && !(await quote(m.email, await contentPrice(), coupon)).couponOk) return { error: "badCoupon" };
  let url: string;
  try {
    url = (await subscribeSegment({ segment, payer: m.email, student, autoRenew: f.get("auto") === "on", coupon })).url;
  } catch (e) {
    if (e instanceof SegmentLocked) return { error: "locked" as never };
    console.error("[buySegment]", e);
    return { error: "pay" };
  }
  redirect(url);
}

export async function renewSegment(id: string) {
  const m = await me();
  if (!m || !DATA_LIVE) return;
  const sub = await getContentSub(id, m.email);
  if (!sub || sub.payer_email !== m.email) return;
  redirect((await renewContent(sub, m.email)).url);
}

export async function autoSegment(id: string, on: boolean) {
  const m = await me();
  if (!m || !DATA_LIVE) return;
  const sub = await getContentSub(id, m.email);
  if (sub?.payer_email === m.email) await setContentAutoRenew(sub, on);
  revalidatePath("/learn");
}

export async function stopSegment(id: string) {
  const m = await me();
  if (!m || !DATA_LIVE) return;
  const sub = await getContentSub(id, m.email);
  if (sub?.payer_email === m.email) await cancelContent(sub);
  revalidatePath("/learn");
}
