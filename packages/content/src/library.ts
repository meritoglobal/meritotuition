/**
 * In-memory content service: the API calls this; a Prisma-backed version
 * implements the same methods later. Teacher flow:
 *   browse tree -> open sheet / slides -> "Make exam" (one click, preset)
 *   -> assign to a batch (RoutineSlot) -> students attempt -> auto + manual grading -> topic report.
 */
import { buildExam, gradeAttempt, applyManualMarks, topicReport, PRESETS, type Blueprint, type BuiltExam, type GradeResult, type Answer } from './exam-builder';
import { type LectureSheetBody, renderSheetHtml } from './lecture-sheet';
import { sheetToSlides, type Slide } from './slides';
import type { BankQuestion, McqBody } from './questions';

export class ContentError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

export interface TopicRef { id: string; trackCode: string; subjectCode: string; chapter: number; chapterTitle: string; title: string }

export interface StoredExam extends BuiltExam { id: string; title: string; authorId: string; topicIds: string[]; preset?: string }
export interface Assignment { id: string; examId: string; teacherId: string; slotId?: string; studentIds: string[]; opensAt: Date; closesAt: Date; mode: 'LIVE' | 'PRACTICE' | 'HOMEWORK' }
export interface Attempt { id: string; assignmentId: string; studentId: string; answers: Record<string, Answer>; submittedAt?: Date; result?: GradeResult }

/** What a student sees: no answer keys, options in the shuffled order. */
export interface StudentPaperItem { questionId: string; order: number; marks: number; type: BankQuestion['type']; stem: string; options?: { index: number; text: string }[]; statements?: string[]; parts?: { label: string; prompt: string; marks: number }[] }

let seq = 0;
const newId = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`;

export class ContentLibrary {
  topics = new Map<string, TopicRef>();
  sheets = new Map<string, { topicId: string; ownerId: string | null; body: LectureSheetBody }>();
  questions = new Map<string, BankQuestion>();
  exams = new Map<string, StoredExam>();
  assignments = new Map<string, Assignment>();
  attempts = new Map<string, Attempt>();

  /** Load platform content (seed files). */
  addTopic(t: TopicRef, sheet?: LectureSheetBody, qs: BankQuestion[] = []) {
    this.topics.set(t.id, t);
    if (sheet) this.sheets.set(`sheet_${t.id}`, { topicId: t.id, ownerId: null, body: sheet });
    for (const q of qs) this.questions.set(q.id, q);
  }

  listTopics(f: { trackCode?: string; subjectCode?: string }) {
    return [...this.topics.values()].filter((t) => (!f.trackCode || t.trackCode === f.trackCode) && (!f.subjectCode || t.subjectCode === f.subjectCode))
      .map((t) => ({ ...t, hasSheet: this.sheetFor(t.id) !== undefined, questionCount: this.bankFor([t.id]).length }));
  }

  private sheetFor(topicId: string, teacherId?: string) {
    const all = [...this.sheets.entries()].filter(([, s]) => s.topicId === topicId);
    return all.find(([, s]) => teacherId && s.ownerId === teacherId) ?? all.find(([, s]) => s.ownerId === null);
  }

  /** Teacher's own edited copy if they have one, otherwise the platform sheet. */
  getSheet(topicId: string, teacherId?: string) {
    const hit = this.sheetFor(topicId, teacherId);
    if (!hit) throw new ContentError('NO_SHEET', 'এই টপিকের লেকচার শিট এখনো তৈরি হয়নি', 404);
    return { id: hit[0], owner: hit[1].ownerId ? 'TEACHER' : 'PLATFORM', body: hit[1].body };
  }

  sheetHtml(topicId: string, teacherId?: string, teacherName?: string, withTeacherNotes = false) {
    return renderSheetHtml(this.getSheet(topicId, teacherId).body, { teacherName, withTeacherNotes });
  }

  slides(topicId: string, teacherId?: string): Slide[] {
    return sheetToSlides(this.getSheet(topicId, teacherId).body);
  }

  /** Copy-on-edit: teacher saves changes as their own version; platform original stays. */
  saveTeacherSheet(topicId: string, teacherId: string, body: LectureSheetBody) {
    const mine = [...this.sheets.entries()].find(([, s]) => s.topicId === topicId && s.ownerId === teacherId);
    const id = mine?.[0] ?? newId('sheet');
    this.sheets.set(id, { topicId, ownerId: teacherId, body });
    return { id };
  }

  bankFor(topicIds: string[]) {
    const want = new Set(topicIds);
    return [...this.questions.values()].filter((q) => q.topicIds.some((t) => want.has(t)));
  }

  /** The one-click button. */
  makeExam(p: { teacherId: string; topicIds: string[]; preset?: keyof typeof PRESETS; blueprint?: Blueprint; title?: string; seed?: number; avoidRecentFor?: string }) {
    const blueprint = p.blueprint ?? PRESETS[p.preset ?? 'CLASS_TEST'];
    if (!blueprint) throw new ContentError('BAD_PRESET', 'Unknown preset');
    const bank = this.bankFor(p.topicIds);
    if (!bank.length) throw new ContentError('EMPTY_BANK', 'এই টপিকগুলোর জন্য প্রশ্নব্যাংকে কোনো প্রশ্ন নেই');
    const recentlyUsed = p.avoidRecentFor ? this.recentQuestionIds(p.avoidRecentFor) : undefined;
    const built = buildExam(bank, blueprint, { seed: p.seed, recentlyUsed });
    const topicTitles = p.topicIds.map((t) => this.topics.get(t)?.title).filter(Boolean).join(', ');
    const exam: StoredExam = { ...built, id: newId('exam'), title: p.title ?? `${topicTitles} — পরীক্ষা`, authorId: p.teacherId, topicIds: p.topicIds, preset: p.preset };
    this.exams.set(exam.id, exam);
    return exam;
  }

  /** Swap one question for another of the same type/difficulty (teacher doesn't like it). */
  swapQuestion(examId: string, teacherId: string, questionId: string) {
    const exam = this.ownExam(examId, teacherId);
    const old = this.questions.get(questionId);
    const item = exam.items.find((i) => i.questionId === questionId);
    if (!old || !item) throw new ContentError('NOT_IN_EXAM', 'Question is not in this exam');
    const used = new Set(exam.items.map((i) => i.questionId));
    const pool = this.bankFor(exam.topicIds).filter((q) => q.type === old.type && !used.has(q.id));
    const pick = pool.find((q) => q.difficulty === old.difficulty) ?? pool[0];
    if (!pick) throw new ContentError('NO_ALTERNATIVE', 'বদলানোর মতো আর কোনো প্রশ্ন নেই');
    item.questionId = pick.id;
    item.optionOrder = (pick.body as McqBody).options ? [...Array((pick.body as McqBody).options.length).keys()] : undefined;
    return exam;
  }

  assign(p: { examId: string; teacherId: string; slotId?: string; studentIds: string[]; opensAt: Date; closesAt: Date; mode?: Assignment['mode'] }) {
    this.ownExam(p.examId, p.teacherId);
    if (!p.studentIds.length) throw new ContentError('NO_STUDENTS', 'এই ব্যাচে কোনো শিক্ষার্থী নেই');
    if (p.closesAt <= p.opensAt) throw new ContentError('BAD_WINDOW', 'শেষ সময় শুরুর পরে হতে হবে');
    const a: Assignment = { id: newId('asg'), mode: p.mode ?? 'PRACTICE', ...p };
    this.assignments.set(a.id, a);
    return a;
  }

  studentInbox(studentId: string, now = new Date()) {
    return [...this.assignments.values()].filter((a) => a.studentIds.includes(studentId)).map((a) => {
      const exam = this.exams.get(a.examId)!;
      const att = this.attemptOf(a.id, studentId);
      return { assignmentId: a.id, title: exam.title, opensAt: a.opensAt, closesAt: a.closesAt, durationMin: exam.durationMin, totalMarks: exam.totalMarks,
        state: att?.submittedAt ? 'SUBMITTED' : now < a.opensAt ? 'UPCOMING' : now > a.closesAt ? 'MISSED' : 'OPEN', score: att?.result?.autoScore };
    });
  }

  /** Paper without answers. MCQ options shown in the exam's shuffled order. */
  paper(assignmentId: string, studentId: string, now = new Date()): { title: string; durationMin: number; negativeMark: number; items: StudentPaperItem[] } {
    const a = this.studentAssignment(assignmentId, studentId);
    if (now < a.opensAt) throw new ContentError('NOT_OPEN', 'পরীক্ষা এখনো শুরু হয়নি', 403);
    const exam = this.exams.get(a.examId)!;
    const items = exam.items.map((it) => {
      const q = this.questions.get(it.questionId)!;
      const b = q.body as unknown as Record<string, unknown>;
      const base: StudentPaperItem = { questionId: q.id, order: it.order, marks: it.marks, type: q.type, stem: String(b.stem) };
      if (Array.isArray(b.options)) base.options = (it.optionOrder ?? (b.options as string[]).map((_, i) => i)).map((i) => ({ index: i, text: (b.options as string[])[i]! }));
      if (Array.isArray(b.statements)) base.statements = b.statements as string[];
      if (Array.isArray(b.parts)) base.parts = (b.parts as { label: string; prompt: string; marks: number }[]).map(({ label, prompt, marks }) => ({ label, prompt, marks }));
      return base;
    });
    return { title: exam.title, durationMin: exam.durationMin, negativeMark: exam.negativeMark, items };
  }

  submit(assignmentId: string, studentId: string, answers: Record<string, Answer>, now = new Date()) {
    const a = this.studentAssignment(assignmentId, studentId);
    if (now > a.closesAt && a.mode === 'LIVE') throw new ContentError('CLOSED', 'সময় শেষ', 403);
    let att = this.attemptOf(a.id, studentId);
    if (att?.submittedAt && a.mode !== 'PRACTICE') throw new ContentError('ALREADY_SUBMITTED', 'আগেই জমা দেওয়া হয়েছে', 409);
    const exam = this.exams.get(a.examId)!;
    att = { id: att?.id ?? newId('att'), assignmentId: a.id, studentId, answers, submittedAt: now, result: gradeAttempt(exam, this.questions, answers) };
    this.attempts.set(att.id, att);
    return att.result!;
  }

  /** Teacher marks CQ / written answers. */
  gradeManual(attemptId: string, teacherId: string, marks: Record<string, number>) {
    const att = this.attempts.get(attemptId);
    if (!att?.result) throw new ContentError('NO_ATTEMPT', 'Attempt not found', 404);
    const a = this.assignments.get(att.assignmentId)!;
    if (a.teacherId !== teacherId) throw new ContentError('FORBIDDEN', 'Not your exam', 403);
    att.result = applyManualMarks(att.result, marks);
    return att.result;
  }

  /** Batch results + weakest topics first. */
  results(assignmentId: string, teacherId: string) {
    const a = this.assignments.get(assignmentId);
    if (!a || a.teacherId !== teacherId) throw new ContentError('FORBIDDEN', 'Not your exam', 403);
    const atts = [...this.attempts.values()].filter((t) => t.assignmentId === a.id && t.result);
    return {
      students: a.studentIds.map((s) => {
        const t = atts.find((x) => x.studentId === s);
        return { studentId: s, attemptId: t?.id, score: t?.result?.autoScore ?? null, max: t?.result?.maxScore ?? null, pendingManual: t?.result?.pendingManual ?? 0 };
      }),
      topics: topicReport(this.questions, atts.map((t) => t.result!)).map((r) => ({ ...r, title: this.topics.get(r.topicId)?.title })),
    };
  }

  private ownExam(examId: string, teacherId: string) {
    const e = this.exams.get(examId);
    if (!e) throw new ContentError('NO_EXAM', 'Exam not found', 404);
    if (e.authorId !== teacherId) throw new ContentError('FORBIDDEN', 'Not your exam', 403);
    return e;
  }
  private studentAssignment(id: string, studentId: string) {
    const a = this.assignments.get(id);
    if (!a || !a.studentIds.includes(studentId)) throw new ContentError('NOT_ASSIGNED', 'এই পরীক্ষা তোমার জন্য নয়', 403);
    return a;
  }
  private attemptOf(assignmentId: string, studentId: string) {
    return [...this.attempts.values()].find((t) => t.assignmentId === assignmentId && t.studentId === studentId);
  }
  private recentQuestionIds(teacherId: string) {
    const ex = [...this.exams.values()].filter((e) => e.authorId === teacherId).slice(-3);
    return new Set(ex.flatMap((e) => e.items.map((i) => i.questionId)));
  }
}
