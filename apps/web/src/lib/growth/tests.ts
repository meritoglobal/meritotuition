import "server-only";
import { gradeExam, studentView, type ExamAnswers, type ExamQuestion } from "@mastermoshai/core";
import { db } from "@/lib/data";
import { contentAccess } from "@mastermoshai/core";
import { accessContext } from "@/lib/biz/access";
import { hasPaid } from "./pay";
import { isUuid } from "./people";

export interface ModelTest {
  id: string; title: string; subject: string; level: string; questions: ExamQuestion[]; duration_min: number; price: number;
  opens_at: string; closes_at: string | null; published: boolean; created_at: string;
}
export interface Attempt { test_id: string; email: string; name: string | null; school: string | null; started_at: string; score: number | null; max_score: number | null; time_sec: number | null; submitted_at: string | null; answers: ExamAnswers | null }
export interface Ranked { rank: number; name: string; school: string | null; score: number; max: number; timeSec: number; me: boolean }

export async function listTests(): Promise<(ModelTest & { takers: number })[]> {
  const { data } = await db().from("model_tests").select("*, model_test_attempts(count)").eq("published", true).lte("opens_at", new Date().toISOString()).order("opens_at", { ascending: false }).limit(50);
  return ((data ?? []) as (ModelTest & { model_test_attempts: { count: number }[] })[]).map(({ model_test_attempts, ...t }) => ({ ...t, takers: model_test_attempts?.[0]?.count ?? 0 }));
}

export async function getTest(id: string): Promise<ModelTest | null> {
  if (!isUuid(id)) return null;
  const { data } = await db().from("model_tests").select("*").eq("id", id).maybeSingle();
  return (data as ModelTest) ?? null;
}

export const isOpen = (t: ModelTest, now = new Date()) => t.published && new Date(t.opens_at) <= now && (!t.closes_at || new Date(t.closes_at) > now);
export const forStudent = (t: ModelTest) => ({ ...t, questions: studentView(t.questions) });

/** Free tests, paid ones, and every test of a subject+class the student studies with a tutor here or has a segment subscription for. */
export async function canTake(t: ModelTest, email: string) {
  if (t.price <= 0 || (await hasPaid("TEST", t.id, email))) return true;
  return contentAccess(t, await accessContext({ email })).open;
}

export async function myAttempt(testId: string, email: string): Promise<Attempt | null> {
  const { data } = await db().from("model_test_attempts").select("*").eq("test_id", testId).eq("email", email).maybeSingle();
  return (data as Attempt) ?? null;
}

/** The clock starts on the first open; reopening does not restart it. */
export async function start(t: ModelTest, email: string, name: string, school?: string): Promise<Attempt> {
  const s = db();
  await s.from("model_test_attempts").upsert({ test_id: t.id, email, name: name.slice(0, 60), school: school?.slice(0, 80) || null }, { onConflict: "test_id,email", ignoreDuplicates: true });
  return (await myAttempt(t.id, email))!;
}

export async function submit(t: ModelTest, a: Attempt, raw: unknown): Promise<Attempt> {
  if (a.submitted_at) return a;
  const given = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const answers: ExamAnswers = {};
  for (const q of t.questions) if (Number.isInteger(given[q.id])) answers[q.id] = given[q.id] as number;
  const r = gradeExam(t.questions, answers);
  const spent = Math.round((Date.now() - new Date(a.started_at).getTime()) / 1000);
  const time_sec = Math.max(1, Math.min(spent, t.duration_min * 60 + 30));
  const { data } = await db().from("model_test_attempts").update({ answers, score: r.autoScore, max_score: r.maxMarks, time_sec, submitted_at: new Date().toISOString() })
    .eq("test_id", t.id).eq("email", a.email).is("submitted_at", null).select("*").maybeSingle();
  return (data as Attempt) ?? (await myAttempt(t.id, a.email))!;
}

/** Higher score first; on a tie, the faster one. */
export async function board(testId: string, me?: string, limit = 50): Promise<{ top: Ranked[]; mine: Ranked | null; total: number }> {
  const s = db();
  const { data, count } = await s.from("model_test_attempts").select("email,name,school,score,max_score,time_sec", { count: "exact" })
    .eq("test_id", testId).not("submitted_at", "is", null).order("score", { ascending: false }).order("time_sec", { ascending: true }).limit(limit);
  const row = (r: { email: string; name: string | null; school: string | null; score: number; max_score: number; time_sec: number }, rank: number): Ranked =>
    ({ rank, name: r.name || r.email.split("@")[0]!, school: r.school, score: Number(r.score), max: Number(r.max_score), timeSec: r.time_sec, me: r.email === me });
  const top = (data ?? []).map((r, i) => row(r, i + 1));
  let mine = top.find((r) => r.me) ?? null;
  if (!mine && me) {
    const a = await myAttempt(testId, me);
    if (a?.submitted_at) {
      const { count: better } = await s.from("model_test_attempts").select("email", { count: "exact", head: true }).eq("test_id", testId).not("submitted_at", "is", null)
        .or(`score.gt.${Number(a.score)},and(score.eq.${Number(a.score)},time_sec.lt.${a.time_sec})`);
      mine = row({ email: me, name: a.name, school: a.school, score: Number(a.score), max_score: Number(a.max_score), time_sec: a.time_sec ?? 0 }, (better ?? 0) + 1);
    }
  }
  return { top, mine, total: count ?? top.length };
}

/** This month's table across all model tests: total marks, then total time. */
export async function monthBoard(me?: string, limit = 50): Promise<Ranked[]> {
  const local = new Date(Date.now() + 6 * 3600_000);
  const from = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - 6 * 3600_000).toISOString();
  const { data } = await db().from("model_test_attempts").select("email,name,school,score,max_score,time_sec").gte("submitted_at", from).limit(5000);
  const by = new Map<string, Ranked & { email: string }>();
  for (const r of data ?? []) {
    const x = by.get(r.email) ?? { email: r.email, rank: 0, name: r.name || r.email.split("@")[0]!, school: r.school, score: 0, max: 0, timeSec: 0, me: r.email === me };
    x.score += Number(r.score); x.max += Number(r.max_score); x.timeSec += r.time_sec ?? 0;
    by.set(r.email, x);
  }
  return [...by.values()].sort((a, b) => b.score - a.score || a.timeSec - b.timeSec).slice(0, limit).map((x, i) => ({ ...x, rank: i + 1 }));
}

/**
 * Questions typed one per line: `question | option 1 | option 2 | option 3 | option 4 | right option number`.
 * Bangla digits are fine. Returns questions or the line numbers that are wrong.
 */
export function parseQuestions(text: string): { questions: ExamQuestion[]; bad: number[] } {
  const questions: ExamQuestion[] = [], bad: number[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const parts = line.split("|").map((p) => p.trim());
    const ans = Number(parts.at(-1)!.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))));
    const options = parts.slice(1, -1).filter(Boolean);
    if (!parts[0] || options.length < 2 || options.length > 5 || !Number.isInteger(ans) || ans < 1 || ans > options.length) { bad.push(i + 1); return; }
    questions.push({ id: `q${questions.length + 1}`, kind: "mcq", prompt: parts[0]!.slice(0, 2000), options: options.map((o) => o.slice(0, 300)), answer: ans - 1, marks: 1 });
  });
  return { questions, bad };
}

/** A ready sample so the leaderboard can start on day one (Class 9-10 Physics, chapter 2: motion). */
export const SAMPLE_TEST = {
  title: "এসএসসি মডেল টেস্ট · পদার্থবিজ্ঞান · গতি",
  subject: "Physics",
  lines: [
    "স্থির অবস্থান থেকে 2 m/s² সমত্বরণে চললে 5 s পরে বেগ কত হবে? | 5 m/s | 10 m/s | 20 m/s | 25 m/s | 2",
    "বেগের SI একক কোনটি? | m/s | m/s² | km/h | N | 1",
    "নিচের কোনটি ভেক্টর রাশি? | দ্রুতি | দূরত্ব | সরণ | সময় | 3",
    "সুষম দ্রুতিতে চলা বস্তুর দূরত্ব-সময় লেখচিত্র কেমন হয়? | মূলবিন্দুগামী সরলরেখা | বক্ররেখা | সময় অক্ষের সমান্তরাল রেখা | দূরত্ব অক্ষের সমান্তরাল রেখা | 1",
    "একটি বাস 2 ঘণ্টায় 120 km গেলে তার গড় দ্রুতি কত? | 40 km/h | 60 km/h | 80 km/h | 240 km/h | 2",
    "স্থির অবস্থান থেকে 4 m/s² ত্বরণে চললে 3 s-এ কত দূরত্ব যাবে? | 6 m | 12 m | 18 m | 36 m | 3",
    "বেগ-সময় লেখচিত্রের ঢাল কী নির্দেশ করে? | দূরত্ব | ত্বরণ | সরণ | দ্রুতি | 2",
    "মুক্তভাবে পড়ন্ত বস্তুর ত্বরণ প্রায় কত? | 9.8 m/s | 9.8 m/s² | 98 m/s² | শূন্য | 2",
    "20 m/s বেগে চলা একটি রিকশা ব্রেক কষে 4 s-এ থামল। মন্দন কত? | 4 m/s² | 5 m/s² | 16 m/s² | 80 m/s² | 2",
    "বৃত্তাকার পথে একবার পুরো ঘুরে আগের জায়গায় এলে সরণ কত? | পরিধির সমান | ব্যাসের সমান | শূন্য | ব্যাসার্ধের সমান | 3",
  ],
};
