"use server";
import { revalidatePath } from "next/cache";
import { DATA_LIVE, db } from "@/lib/data";
import { releaseSession } from "@/lib/biz/earnings";
import { adminSettle } from "@/lib/biz/payout";
import { refundHalf, rejectComplaint } from "@/lib/biz/complaints";
import { me } from "@/lib/growth/people";

async function admin() {
  const m = await me();
  return m?.admin && DATA_LIVE ? m : null;
}

export async function settle(id: string, ok: boolean, f: FormData) {
  if (!(await admin())) return;
  await adminSettle(id, ok, String(f.get("trx") ?? "").trim().slice(0, 40));
  revalidatePath("/admin/payouts");
}

export async function forceRelease(sessionId: string) {
  if (!(await admin())) return;
  await db().from("class_sessions").update({ status: "OPEN" }).eq("id", sessionId).eq("status", "EMPTY");
  await releaseSession(sessionId, true);
  revalidatePath("/admin/payouts");
}

export async function setExpert(f: FormData) {
  if (!(await admin())) return;
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  await db().from("teacher_profiles").update({ expert: f.get("on") === "1" }).eq("email", email);
  revalidatePath("/admin/payouts");
}

export async function decideComplaint(id: string, half: boolean, f: FormData) {
  const m = await admin();
  if (!m) return;
  const note = String(f.get("note") ?? "").trim().slice(0, 300);
  if (half) await refundHalf(id, note || `admin ${m.email}`);
  else await rejectComplaint(id, note);
  revalidatePath("/admin/payouts");
}
