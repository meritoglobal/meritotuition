"use server";
import { revalidatePath } from "next/cache";
import { DATA_LIVE, db } from "@/lib/data";
import { me } from "@/lib/growth/people";
import { newGuardianCode, useGuardianCode } from "@/lib/growth/parent";

export type LinkState = { ok?: boolean; error?: "bad" | "self" | "login" | "off"; code?: string } | null;

export async function linkChild(_: LinkState, f: FormData): Promise<LinkState> {
  const m = await me();
  if (!m) return { error: "login" };
  if (!DATA_LIVE) return { error: "off" };
  const r = await useGuardianCode(m.email, String(f.get("code") ?? ""), String(f.get("name") ?? "").trim().slice(0, 60));
  if (!r.ok) return { error: r.error };
  revalidatePath("/parent");
  return { ok: true };
}

export async function makeCode(_: LinkState): Promise<LinkState> {
  const m = await me();
  if (!m) return { error: "login" };
  if (!DATA_LIVE) return { error: "off" };
  return { ok: true, code: await newGuardianCode(m.email, m.user.id) };
}

export async function setWeeklyEmail(student: string, on: boolean) {
  const m = await me();
  if (!m || !DATA_LIVE) return;
  await db().from("guardian_links").update({ weekly_email: on }).eq("guardian_email", m.email).eq("student_email", student);
  revalidatePath("/parent");
}
