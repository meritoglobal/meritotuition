/**
 * Exams a tutor sets for their own class: MCQ, written, or both in one paper.
 * MCQ is marked instantly; written answers wait for the tutor's marks.
 */
export type ExamQuestionKind = "mcq" | "written";

export interface ExamQuestion {
  id: string;
  kind: ExamQuestionKind;
  prompt: string;
  /** MCQ only: 2 to 5 options. */
  options?: string[];
  /** MCQ only: index of the right option. Never sent to students. */
  answer?: number;
  marks: number;
}

/** What a student hands in: option index for MCQ, text for written. */
export type ExamAnswers = Record<string, number | string | null | undefined>;

export interface ExamResult {
  autoScore: number;
  /** Tutor marks for written questions, by question id. */
  manual: Record<string, number>;
  total: number;
  maxMarks: number;
  /** True once every written question has a mark (or there are none). */
  checked: boolean;
}

export const MAX_OPTIONS = 5;

/** Problems with a draft paper, empty when it is fine to publish. */
export function validateExam(qs: ExamQuestion[]): string[] {
  const errs: string[] = [];
  if (qs.length === 0) errs.push("no-questions");
  qs.forEach((q, i) => {
    const at = `q${i + 1}`;
    if (!q.prompt.trim()) errs.push(`${at}:prompt`);
    if (!(q.marks > 0) || q.marks > 100) errs.push(`${at}:marks`);
    if (q.kind === "mcq") {
      const n = q.options?.length ?? 0;
      if (n < 2 || n > MAX_OPTIONS) errs.push(`${at}:options`);
      if (q.options?.some((o) => !o.trim())) errs.push(`${at}:option-empty`);
      if (q.answer === undefined || q.answer < 0 || q.answer >= n) errs.push(`${at}:answer`);
    }
  });
  return errs;
}

/** The paper as a student sees it: no answer key. */
export function studentView(qs: ExamQuestion[]): ExamQuestion[] {
  return qs.map(({ answer: _a, ...q }) => q);
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Mark a submission. Manual marks are clamped to each question's marks. */
export function gradeExam(qs: ExamQuestion[], answers: ExamAnswers, manual: Record<string, number> = {}): ExamResult {
  let autoScore = 0;
  let maxMarks = 0;
  const kept: Record<string, number> = {};
  let checked = true;
  for (const q of qs) {
    maxMarks += q.marks;
    if (q.kind === "mcq") {
      if (answers[q.id] === q.answer && typeof q.answer === "number") autoScore += q.marks;
    } else {
      const m = manual[q.id];
      if (typeof m === "number" && Number.isFinite(m)) kept[q.id] = round(Math.min(q.marks, Math.max(0, m)));
      else checked = false;
    }
  }
  const total = round(autoScore + Object.values(kept).reduce((a, b) => a + b, 0));
  return { autoScore: round(autoScore), manual: kept, total, maxMarks: round(maxMarks), checked };
}
