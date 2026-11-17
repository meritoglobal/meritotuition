import "server-only";
import { db } from "@/lib/data";
import { notify } from "./notify";
import { dhakaDay } from "./people";

/** Tutor Pro: a monthly fee for a Pro badge, first place in suggestions and offers, and email alerts. */
export const PRO_PRICE = Math.max(100, Number(process.env.PRO_PRICE ?? 499) || 499);
const MONTH_MS = 30 * 86_400_000;

export async function proUntil(userId: string): Promise<Date | null> {
  const { data } = await db().from("tutor_pro").select("until").eq("user_id", userId).maybeSingle();
  return data?.until ? new Date(data.until) : null;
}

export const isPro = async (userId: string) => ((await proUntil(userId)) ?? new Date(0)) > new Date();

/** Which of these tutors are Pro right now. */
export async function proSet(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { data } = await db().from("tutor_pro").select("user_id").in("user_id", ids).gt("until", new Date().toISOString());
  return new Set((data ?? []).map((r) => r.user_id));
}

/** After payment: one more month, counted from today or from the current end. */
export async function extendPro(userId: string, email: string) {
  const cur = await proUntil(userId);
  const from = cur && cur > new Date() ? cur : new Date();
  const until = new Date(from.getTime() + MONTH_MS).toISOString();
  await db().from("tutor_pro").upsert({ user_id: userId, email, until, reminded: null, updated_at: new Date().toISOString() });
  await notify({ email, kind: "PRO", title: "আপনি এখন Pro টিউটর!", body: "নতুন রিকোয়েস্টে আপনার নাম সবার আগে দেখাবে।", path: "/teach/pro" });
}

/** Daily: remind tutors whose Pro ends within 3 days, once a day at most. */
export async function proReminders(now = new Date()): Promise<number> {
  const today = dhakaDay(now);
  const soon = new Date(now.getTime() + 3 * 86_400_000).toISOString();
  const { data } = await db().from("tutor_pro").select("user_id,email,until,reminded").gt("until", now.toISOString()).lt("until", soon);
  let n = 0;
  for (const r of data ?? []) {
    if (!r.email || r.reminded === today) continue;
    await notify({ email: r.email, kind: "PRO", title: "আপনার Pro শেষ হতে চলেছে", body: "এক ট্যাপে আরেক মাস বাড়িয়ে নিন।", path: "/teach/pro", mail: true });
    await db().from("tutor_pro").update({ reminded: today }).eq("user_id", r.user_id);
    n++;
  }
  return n;
}
