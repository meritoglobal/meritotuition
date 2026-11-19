"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SUBJECTS } from "@mastermoshai/core";
import { DATA_LIVE, db } from "@/lib/data";
import { me } from "@/lib/growth/people";
import { startPayment } from "@/lib/growth/pay";
import { canTake, getTest, isOpen, parseQuestions, SAMPLE_TEST, start } from "@/lib/growth/tests";

export type TestState = { ok?: boolean; error?: string; bad?: number[] } | null;

export async function startTest(id: string, _: TestState, f: FormData): Promise<TestState> {
  const m = await me();
  if (!m) redirect(`/login?next=/leaderboard/${id}`);
  const t = DATA_LIVE ? await getTest(id) : null;
  if (!t || !isOpen(t)) return { error: "closed" };
  if (!(await canTake(t, m.email))) return { error: "pay" };
  await start(t, m.email, String(f.get("name") ?? "").trim() || m.name, String(f.get("school") ?? "").trim());
  revalidatePath(`/leaderboard/${id}`);
  return { ok: true };
}

export async function buyTest(id: string) {
  const m = await me();
  if (!m) redirect(`/login?next=/leaderboard/${id}`);
  const t = DATA_LIVE ? await getTest(id) : null;
  if (!t || t.price <= 0) redirect(`/leaderboard/${id}`);
  const { url } = await startPayment({ purpose: "TEST", refId: t.id, payer: m.email, listPrice: t.price });
  redirect(url);
}

export async function createTest(_: TestState, f: FormData): Promise<TestState> {
  const m = await me();
  if (!m?.admin || !DATA_LIVE) return { error: "forbidden" };
  const { questions, bad } = parseQuestions(String(f.get("questions") ?? ""));
  if (bad.length) return { error: "lines", bad };
  const title = String(f.get("title") ?? "").trim().slice(0, 160);
  const subject = SUBJECTS.find((s) => s === f.get("subject"));
  const dur = Number(f.get("duration")), price = Number(f.get("price") || 0);
  if (!title || !subject || !questions.length || !(dur >= 1 && dur <= 300) || !(price >= 0 && price <= 5000)) return { error: "bad" };
  const { data, error } = await db().from("model_tests").insert({ title, subject, questions, duration_min: Math.round(dur), price: Math.round(price), created_by: m.email }).select("id").single();
  if (error) return { error: "db" };
  redirect(`/leaderboard/${data.id}`);
}

export async function createSample() {
  const m = await me();
  if (!m?.admin || !DATA_LIVE) return;
  const { questions } = parseQuestions(SAMPLE_TEST.lines.join("\n"));
  const { data } = await db().from("model_tests").insert({ title: SAMPLE_TEST.title, subject: SAMPLE_TEST.subject, questions, duration_min: 15, price: 0, created_by: m.email }).select("id").single();
  if (data) redirect(`/leaderboard/${data.id}`);
}
