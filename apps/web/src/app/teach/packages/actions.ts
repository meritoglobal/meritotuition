"use server";
import { revalidatePath } from "next/cache";
import { CLASS_LEVELS, SUBJECTS } from "@mastermoshai/core";
import { getProfile, teacherBatch } from "@/lib/batches";
import { DATA_LIVE, db } from "@/lib/data";
import { me } from "@/lib/growth/people";

export type PkgState = { ok?: boolean; error?: "bad" | "profile" | "db" } | null;

const num = (f: FormData, k: string, lo: number, hi: number) => {
  const v = Number(String(f.get(k) ?? "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/[^\d]/g, ""));
  return Number.isInteger(v) && v >= lo && v <= hi ? v : null;
};

export async function createPackage(_: PkgState, f: FormData): Promise<PkgState> {
  const m = await me();
  if (!m || !DATA_LIVE) return { error: "db" };
  const profile = await getProfile(m.user.id);
  if (!profile) return { error: "profile" };
  const subject = SUBJECTS.find((s) => s === f.get("subject"));
  const level = CLASS_LEVELS.find((l) => l === f.get("level"));
  const title = String(f.get("title") ?? "").trim().slice(0, 120);
  const days = num(f, "days", 1, 7), classes = num(f, "classes", 1, f.get("billing") === "BATCH" ? 120 : 40), price = num(f, "price", 100, 100000);
  if (!subject || !level || !title || !days || !classes || !price) return { error: "bad" };
  const batchId = String(f.get("batch") ?? "");
  const batch = batchId ? await teacherBatch(batchId, m.user.id) : null;
  const { error } = await db().from("packages").insert({
    teacher_id: m.user.id, teacher_email: m.email, teacher_name: profile.name, batch_id: batch?.id ?? null,
    title, subject, level, days_per_week: days, classes_per_month: classes, price,
    billing: f.get("billing") === "BATCH" ? "BATCH" : "MONTHLY",
  });
  if (error) return { error: "db" };
  revalidatePath("/teach/packages");
  return { ok: true };
}

export async function togglePackage(id: string, active: boolean) {
  const m = await me();
  if (!m || !DATA_LIVE) return;
  await db().from("packages").update({ active }).eq("id", id).eq("teacher_id", m.user.id);
  revalidatePath("/teach/packages");
}
