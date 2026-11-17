"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CLASS_LEVELS, SUBJECTS } from "@mastermoshai/core";
import { getUser } from "@/lib/auth/session";
import { DATA_LIVE, db } from "@/lib/data";
import { teacherBatch } from "@/lib/batches";
import { weekStart } from "@/lib/growth/people";
import { cancelChange, getChange, propose } from "@/lib/biz/schedule";

export type FormState = { ok?: boolean; error?: string } | null;

async function me() {
  const u = await getUser();
  if (!u) redirect("/login?next=/teach");
  if (!DATA_LIVE) throw new Error("data-off");
  return u;
}

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const int = (f: FormData, k: string, lo: number, hi: number) => {
  const v = Number(String(f.get(k) ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(v) && v >= lo && v <= hi ? v : null;
};
const pick = <T extends readonly string[]>(f: FormData, k: string, allowed: T) =>
  f.getAll(k).map(String).filter((x): x is T[number] => (allowed as readonly string[]).includes(x));

export async function saveProfile(_: FormState, f: FormData): Promise<FormState> {
  const u = await me();
  const row = {
    user_id: u.id, email: u.email ?? null,
    name: str(f, "name", 80), headline: str(f, "headline", 140) || null, bio: str(f, "bio", 4000) || null,
    university: str(f, "university", 80) || null, department: str(f, "department", 80) || null,
    subjects: pick(f, "subjects", SUBJECTS), levels: pick(f, "levels", CLASS_LEVELS),
    teaches_online: f.get("teaches_online") === "on", teaches_home: f.get("teaches_home") === "on",
    home_area: str(f, "home_area", 60) || null, home_radius_km: int(f, "home_radius_km", 1, 50),
    price_online: int(f, "price_online", 0, 100000), price_home: int(f, "price_home", 0, 100000),
    phone: str(f, "phone", 20) || null, updated_at: new Date().toISOString(),
  };
  if (!row.name || row.subjects.length === 0) return { error: "bad" };
  const { error } = await db().from("teacher_profiles").upsert(row);
  if (error) return { error: "db" };
  revalidatePath("/teach", "layout");
  return { ok: true };
}

export async function createBatch(_: FormState, f: FormData): Promise<FormState> {
  const u = await me();
  const days = f.getAll("day").map(Number);
  const times = f.getAll("time").map(String);
  const mins = f.getAll("minutes").map(Number);
  const schedule = days
    .map((day, i) => ({ day, time: times[i] ?? "", minutes: mins[i] || 60 }))
    .filter((s) => Number.isInteger(s.day) && s.day >= 0 && s.day <= 6 && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time) && s.minutes >= 15 && s.minutes <= 240)
    .slice(0, 14);
  const subject = pick(f, "subject", SUBJECTS)[0];
  const level = pick(f, "level", CLASS_LEVELS)[0];
  const title = str(f, "title", 120);
  if (!title || !subject || !level || schedule.length === 0) return { error: "bad" };
  const { data, error } = await db().from("batches").insert({
    teacher_id: u.id, title, subject, level, mode: f.get("mode") === "OFFLINE" ? "OFFLINE" : "ONLINE",
    capacity: int(f, "capacity", 1, 50) ?? 5, fee: int(f, "fee", 0, 100000), schedule,
  }).select("id").single();
  if (error || !data) return { error: "db" };
  redirect(`/teach/batches/${data.id}`);
}

export async function addStudent(batchId: string, _: FormState, f: FormData): Promise<FormState> {
  const u = await me();
  const b = await teacherBatch(batchId, u.id);
  if (!b) return { error: "db" };
  const email = str(f, "email", 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "badEmail" };
  const { count } = await db().from("batch_students").select("email", { count: "exact", head: true }).eq("batch_id", b.id);
  if ((count ?? 0) >= b.capacity) return { error: "full" };
  const { error } = await db().from("batch_students").upsert({ batch_id: b.id, email, name: str(f, "name", 80) || null });
  if (error) return { error: "db" };
  revalidatePath(`/teach/batches/${b.id}`);
  return { ok: true };
}

export async function removeStudent(batchId: string, email: string) {
  const u = await me();
  const b = await teacherBatch(batchId, u.id);
  if (!b) return;
  await db().from("batch_students").delete().eq("batch_id", b.id).eq("email", email);
  revalidatePath(`/teach/batches/${b.id}`);
}

export async function setBatchActive(batchId: string, active: boolean) {
  const u = await me();
  const b = await teacherBatch(batchId, u.id);
  if (!b) return;
  await db().from("batches").update({ active }).eq("id", b.id);
  revalidatePath("/teach", "layout");
}

/** Tutor's weekly line about a student; parents see it in their report. */
export async function saveNote(batchId: string, email: string, _: FormState, f: FormData): Promise<FormState> {
  const u = await me();
  const b = await teacherBatch(batchId, u.id);
  if (!b) return { error: "db" };
  const note = str(f, "note", 1000);
  if (!note) return { error: "bad" };
  const { error } = await db().from("progress_notes").upsert(
    { batch_id: b.id, student_email: email, teacher_id: u.id, week_start: weekStart(), rating: int(f, "rating", 1, 5), note },
    { onConflict: "batch_id,student_email,week_start" },
  );
  if (error) return { error: "db" };
  revalidatePath(`/teach/batches/${b.id}`);
  return { ok: true };
}

export type ChangeState = { ok?: boolean; error?: "bad" | "past" | "db" } | null;

/** Tutor proposes a new weekly routine or moves one class; students must approve. */
export async function proposeChange(batchId: string, _: ChangeState, f: FormData): Promise<ChangeState> {
  const u = await me();
  const b = await teacherBatch(batchId, u.id);
  if (!b) return { error: "db" };
  const kind = f.get("kind") === "RESCHEDULE" ? "RESCHEDULE" : "ROUTINE";
  const days = f.getAll("day"), times = f.getAll("time"), mins = f.getAll("minutes");
  const schedule = days.map((d, i) => ({ day: Number(d), time: String(times[i] ?? ""), minutes: Number(mins[i] ?? 60) }));
  // datetime-local has no zone: the tutor means Dhaka time.
  const dhaka = (v: FormDataEntryValue | null) => (v ? `${String(v)}${String(v).length === 16 ? ":00" : ""}+06:00` : "");
  const r = await propose(b, {
    kind, schedule, fromAt: String(f.get("fromAt") ?? ""), toAt: dhaka(f.get("toAt")),
    minutes: Number(f.get("moveMinutes") ?? 60), note: String(f.get("note") ?? ""),
  });
  revalidatePath(`/teach/batches/${batchId}`);
  return "error" in r ? { error: r.error } : { ok: true };
}

export async function withdrawChange(batchId: string, id: string) {
  const u = await me();
  const ch = await getChange(id);
  if (ch && ch.teacher_id === u.id) await cancelChange(ch);
  revalidatePath(`/teach/batches/${batchId}`);
}
