"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/data";
import { releaseSession } from "@/lib/biz/earnings";
import { adminSettle } from "@/lib/biz/payout";
import { refundHalf, rejectComplaint } from "@/lib/biz/complaints";
import { adminOrNull, audit } from "@/lib/admin/core";

const admin = adminOrNull;

export async function settle(id: string, ok: boolean, f: FormData) {
  const m = await admin();
  if (!m) return;
  const trx = String(f.get("trx") ?? "").trim().slice(0, 40);
  await adminSettle(id, ok, trx);
  await audit(m.email, ok ? "WITHDRAWAL_PAID" : "WITHDRAWAL_FAILED", id, { trx });
  revalidatePath("/admin", "layout");
}

export async function forceRelease(sessionId: string) {
  const m = await admin();
  if (!m) return;
  await audit(m.email, "SESSION_FORCE_RELEASE", sessionId);
  await db().from("class_sessions").update({ status: "OPEN" }).eq("id", sessionId).eq("status", "EMPTY");
  await releaseSession(sessionId, true);
  revalidatePath("/admin", "layout");
}

export async function setExpert(f: FormData) {
  const m = await admin();
  if (!m) return;
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  await audit(m.email, f.get("on") === "1" ? "TUTOR_EXPERT_ON" : "TUTOR_EXPERT_OFF", email);
  await db().from("teacher_profiles").update({ expert: f.get("on") === "1" }).eq("email", email);
  revalidatePath("/admin", "layout");
}

export async function decideComplaint(id: string, half: boolean, f: FormData) {
  const m = await admin();
  if (!m) return;
  const note = String(f.get("note") ?? "").trim().slice(0, 300);
  if (half) await refundHalf(id, note || `admin ${m.email}`);
  else await rejectComplaint(id, note);
  await audit(m.email, half ? "COMPLAINT_REFUND_HALF" : "COMPLAINT_REJECT", id, { note });
  revalidatePath("/admin", "layout");
}
