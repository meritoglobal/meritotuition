/**
 * One-click exam builder and auto-grader. Pure functions: the API loads
 * candidate questions from the bank, calls buildExam, and stores the result.
 */
import { AUTO_GRADED, type BankQuestion, type Difficulty, type McqBody, type QuestionType, type TrueFalseBody, type FillBlankBody } from './questions';

export interface BlueprintLine {
  type: QuestionType;
  count: number;
  /** Share of each difficulty; defaults to 30% easy / 50% medium / 20% hard. */
  mix?: Partial<Record<Difficulty, number>>;
  /** Marks per question; defaults to the question's own marks. */
  marksEach?: number;
}

export interface Blueprint {
  lines: BlueprintLine[];
  durationMin: number;
  negativeMark?: number;
}

export interface BuiltExamItem {
  questionId: string;
  order: number;
  marks: number;
  /** For MCQ: display order of options (indices into original options). */
  optionOrder?: number[];
}

export interface BuiltExam {
  items: BuiltExamItem[];
  totalMarks: number;
  durationMin: number;
  negativeMark: number;
  seed: number;
  /** Lines that could not be filled from the bank, so the UI can warn the teacher. */
  shortfalls: { type: QuestionType; wanted: number; got: number }[];
}

const DEFAULT_MIX: Record<Difficulty, number> = { EASY: 0.3, MEDIUM: 0.5, HARD: 0.2 };

/** Ready-made blueprints so the teacher only picks topics and clicks once. */
export const PRESETS: Record<string, Blueprint> = {
  QUICK_QUIZ: { lines: [{ type: 'MCQ', count: 10 }], durationMin: 10 },
  CLASS_TEST: { lines: [{ type: 'MCQ', count: 15 }, { type: 'CQ', count: 1 }], durationMin: 40 },
  BOARD_MCQ: { lines: [{ type: 'MCQ', count: 25, mix: { EASY: 0.2, MEDIUM: 0.5, HARD: 0.3 } }], durationMin: 25 },
  BOARD_FULL: { lines: [{ type: 'MCQ', count: 25 }, { type: 'CQ', count: 5 }], durationMin: 180 },
  ADMISSION_MCQ: { lines: [{ type: 'MCQ', count: 50, mix: { EASY: 0.1, MEDIUM: 0.5, HARD: 0.4 } }], durationMin: 45, negativeMark: 0.25 },
  BCS_PRELI_MINI: { lines: [{ type: 'MCQ', count: 50 }], durationMin: 30, negativeMark: 0.5 },
  WRITTEN_PRACTICE: { lines: [{ type: 'WRITTEN', count: 3 }], durationMin: 60 },
};

/** Small seeded PRNG (mulberry32) so a teacher can regenerate the same paper. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

/** Split count across difficulties, largest remainder so the total is exact. */
export function splitByMix(count: number, mix: Partial<Record<Difficulty, number>> = DEFAULT_MIX): Record<Difficulty, number> {
  const keys: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
  const sum = keys.reduce((s, k) => s + (mix[k] ?? 0), 0) || 1;
  const raw = keys.map((k) => ((mix[k] ?? 0) / sum) * count);
  const out = raw.map(Math.floor);
  let left = count - out.reduce((s, n) => s + n, 0);
  const byRemainder = raw.map((r, i) => ({ i, r: r - Math.floor(r) })).sort((x, y) => y.r - x.r);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    out[i] = (out[i] ?? 0) + 1;
    left--;
  }
  return { EASY: out[0] ?? 0, MEDIUM: out[1] ?? 0, HARD: out[2] ?? 0 };
}

export interface BuildOptions {
  seed?: number;
  /** Question ids the students already saw (e.g. last 3 exams), avoided when possible. */
  recentlyUsed?: Set<string>;
  shuffleOptions?: boolean;
}

export function buildExam(bank: BankQuestion[], blueprint: Blueprint, opts: BuildOptions = {}): BuiltExam {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const rand = rng(seed);
  const used = new Set<string>();
  const recent = opts.recentlyUsed ?? new Set<string>();
  const items: BuiltExamItem[] = [];
  const shortfalls: BuiltExam['shortfalls'] = [];

  // Fresh questions first, then recently used ones as a fallback.
  const ranked = (pool: BankQuestion[]) => [
    ...shuffle(pool.filter((q) => !recent.has(q.id)), rand),
    ...shuffle(pool.filter((q) => recent.has(q.id)), rand),
  ];

  for (const line of blueprint.lines) {
    const ofType = bank.filter((q) => q.type === line.type);
    const want = splitByMix(line.count, line.mix);
    const picked: BankQuestion[] = [];
    for (const d of ['EASY', 'MEDIUM', 'HARD'] as Difficulty[]) {
      for (const q of ranked(ofType.filter((x) => x.difficulty === d))) {
        if (picked.filter((p) => p.difficulty === d).length >= want[d]) break;
        if (!used.has(q.id)) { picked.push(q); used.add(q.id); }
      }
    }
    // Not enough at a difficulty: top up from any difficulty of the same type.
    for (const q of ranked(ofType)) {
      if (picked.length >= line.count) break;
      if (!used.has(q.id)) { picked.push(q); used.add(q.id); }
    }
    if (picked.length < line.count) shortfalls.push({ type: line.type, wanted: line.count, got: picked.length });

    // Within a line, order easy -> hard so students warm up.
    const rankD: Record<Difficulty, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };
    picked.sort((a, b) => rankD[a.difficulty] - rankD[b.difficulty]);
    for (const q of picked) {
      const item: BuiltExamItem = { questionId: q.id, order: items.length + 1, marks: line.marksEach ?? q.marks };
      if ((q.type === 'MCQ' || q.type === 'MULTI_MCQ') && opts.shuffleOptions !== false) {
        const n = (q.body as McqBody).options.length;
        item.optionOrder = shuffle([...Array(n).keys()], rand);
      }
      items.push(item);
    }
  }

  return {
    items,
    totalMarks: items.reduce((s, i) => s + i.marks, 0),
    durationMin: blueprint.durationMin,
    negativeMark: blueprint.negativeMark ?? 0,
    seed,
    shortfalls,
  };
}

// ── Grading ──────────────────────────────────────────────────────────────────

/** Answer for MCQ is the ORIGINAL option index (the client maps display order back). */
export type Answer = number | boolean | string | Record<string, string> | null | undefined;

export interface ItemGrade {
  questionId: string;
  marks: number;
  max: number;
  correct: boolean | null; // null = needs teacher
}

export interface GradeResult {
  items: ItemGrade[];
  autoScore: number;
  maxScore: number;
  pendingManual: number; // count of items the teacher still has to mark
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function gradeAttempt(
  exam: Pick<BuiltExam, 'items' | 'negativeMark'>,
  questions: Map<string, BankQuestion>,
  answers: Record<string, Answer>,
): GradeResult {
  const out: ItemGrade[] = [];
  for (const item of exam.items) {
    const q = questions.get(item.questionId);
    if (!q) continue;
    const a = answers[item.questionId];
    const blank = a === undefined || a === null || a === '';
    if (!AUTO_GRADED.includes(q.type)) {
      out.push({ questionId: q.id, marks: 0, max: item.marks, correct: null });
      continue;
    }
    let correct = false;
    if (q.type === 'MCQ' || q.type === 'MULTI_MCQ') correct = a === (q.body as McqBody).answer;
    else if (q.type === 'TRUE_FALSE') correct = a === (q.body as TrueFalseBody).answer;
    else if (q.type === 'FILL_BLANK') correct = typeof a === 'string' && (q.body as FillBlankBody).answers.some((x) => norm(x) === norm(a));
    const isMcq = q.type === 'MCQ' || q.type === 'MULTI_MCQ';
    const marks = correct ? item.marks : blank || !isMcq ? 0 : -exam.negativeMark;
    out.push({ questionId: q.id, marks, max: item.marks, correct: blank ? false : correct });
  }
  return {
    items: out,
    autoScore: round2(out.reduce((s, i) => s + i.marks, 0)),
    maxScore: out.reduce((s, i) => s + i.max, 0),
    pendingManual: out.filter((i) => i.correct === null).length,
  };
}

/** Merge the teacher's marks for CQ/written items into an auto-graded result. */
export function applyManualMarks(result: GradeResult, manual: Record<string, number>): GradeResult {
  const items = result.items.map((i) =>
    {
      const m = manual[i.questionId];
      return i.correct === null && m !== undefined ? { ...i, marks: Math.min(Math.max(m, 0), i.max), correct: m >= i.max / 2 } : i;
    },
  );
  return {
    items,
    autoScore: round2(items.reduce((s, i) => s + i.marks, 0)),
    maxScore: result.maxScore,
    pendingManual: items.filter((i) => i.correct === null).length,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Per-topic accuracy across a batch, so the teacher sees what to re-teach. */
export function topicReport(questions: Map<string, BankQuestion>, graded: GradeResult[]): { topicId: string; correct: number; total: number }[] {
  const acc = new Map<string, { correct: number; total: number }>();
  for (const g of graded) {
    for (const i of g.items) {
      if (i.correct === null) continue;
      for (const t of questions.get(i.questionId)?.topicIds ?? []) {
        const row = acc.get(t) ?? { correct: 0, total: 0 };
        row.total++;
        if (i.correct) row.correct++;
        acc.set(t, row);
      }
    }
  }
  return [...acc.entries()].map(([topicId, v]) => ({ topicId, ...v })).sort((a, b) => a.correct / a.total - b.correct / b.total);
}
