import "server-only";
import { gradeExam, studentView, validateExam, type ExamAnswers, type ExamQuestion } from "@mastermoshai/core";
import { db } from "@/lib/data";

export interface ExamRow {
  id: string; class_id: string; title: string; instructions: string | null; duration_min: number | null;
  questions: ExamQuestion[]; max_marks: number; published: boolean; created_by: string; created_at: string;
}

/** Clean a draft from the browser into stored questions. */
export function cleanQuestions(raw: unknown): ExamQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 100).map((q, i) => {
    const kind = q?.kind === "written" ? "written" : "mcq";
    const base = { id: `q${i + 1}`, kind, prompt: String(q?.prompt ?? "").slice(0, 4000), marks: Number(q?.marks) || 0 } as ExamQuestion;
    if (kind === "mcq") {
      base.options = (Array.isArray(q?.options) ? q.options : []).slice(0, 6).map((o: unknown) => String(o ?? "").slice(0, 500));
      base.answer = Number.isInteger(q?.answer) ? q.answer : -1;
    }
    return base;
  });
}

export { gradeExam, studentView, validateExam };
export type { ExamAnswers, ExamQuestion };

export async function getExam(id: string): Promise<ExamRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("exams").select("*").eq("id", id).maybeSingle();
  return (data as ExamRow) ?? null;
}

/** Keep only answers to real questions, in the right shape. */
export function cleanAnswers(qs: ExamQuestion[], raw: unknown): ExamAnswers {
  const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: ExamAnswers = {};
  for (const q of qs) {
    const v = a[q.id];
    if (q.kind === "mcq" && Number.isInteger(v)) out[q.id] = v as number;
    if (q.kind === "written" && typeof v === "string") out[q.id] = v.slice(0, 20000);
  }
  return out;
}
