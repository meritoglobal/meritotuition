import { describe, expect, it } from "vitest";
import { SEGMENTS, SUBJECTS, findTrack, trackSubjects, LEGACY_LEVEL_MAP } from "../src/taxonomy";
import { buildExam, gradeAttempt, applyManualMarks, splitByMix, PRESETS, topicReport } from "../src/exam-builder";
import { validateSheet, renderSheetHtml } from "../src/lecture-sheet";
import { sheetToSlides } from "../src/slides";
import { sheet, questions } from "../content/class9-physics-ch2-velocity-acceleration";
import type { BankQuestion } from "../src/questions";

describe("taxonomy", () => {
  it("has unique track codes and every subject code is defined", () => {
    const codes = SEGMENTS.flatMap((s) => s.tracks.map((t) => t.code));
    expect(new Set(codes).size).toBe(codes.length);
    for (const s of SEGMENTS) for (const t of s.tracks) for (const sub of trackSubjects(t)) expect(SUBJECTS[sub], `${t.code}:${sub}`).toBeDefined();
  });
  it("covers pre-primary to job/MBA", () => {
    expect(SEGMENTS.map((s) => s.code)).toEqual(expect.arrayContaining(["PRE_PRIMARY", "PRIMARY", "JUNIOR", "SECONDARY", "HIGHER_SECONDARY", "ADMISSION", "UNIVERSITY", "JOB", "POSTGRAD"]));
  });
  it("legacy core levels map to real tracks", () => {
    for (const list of Object.values(LEGACY_LEVEL_MAP)) for (const c of list) expect(findTrack(c), c).toBeDefined();
  });
  it("stream subjects", () => {
    const t = findTrack("CLASS_9")!.track;
    expect(trackSubjects(t, "SCIENCE")).toContain("PHYSICS");
    expect(trackSubjects(t, "SCIENCE")).not.toContain("ACCOUNTING");
  });
});

describe("exam builder", () => {
  it("splits counts exactly", () => {
    expect(splitByMix(10)).toEqual({ EASY: 3, MEDIUM: 5, HARD: 2 });
    const s = splitByMix(7, { EASY: 1, MEDIUM: 1, HARD: 1 });
    expect(s.EASY + s.MEDIUM + s.HARD).toBe(7);
  });
  it("same seed gives same paper, no duplicate questions", () => {
    const a = buildExam(questions, PRESETS.CLASS_TEST!, { seed: 42 });
    const b = buildExam(questions, PRESETS.CLASS_TEST!, { seed: 42 });
    expect(a).toEqual(b);
    const ids = a.items.map((i) => i.questionId);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("reports shortfall when the bank is too small", () => {
    const e = buildExam(questions, PRESETS.QUICK_QUIZ!, { seed: 1 });
    expect(e.items.length).toBe(10);
    const big = buildExam(questions, PRESETS.BOARD_MCQ!, { seed: 1 });
    expect(big.shortfalls).toEqual([{ type: "MCQ", wanted: 25, got: 12 }]);
  });
  it("avoids recently used questions when it can", () => {
    const recent = new Set(["q_c9p_01", "q_c9p_02"]);
    const e = buildExam(questions, { lines: [{ type: "MCQ", count: 5 }], durationMin: 5 }, { seed: 3, recentlyUsed: recent });
    expect(e.items.some((i) => recent.has(i.questionId))).toBe(false);
  });
  it("grades MCQ with negative marking and leaves CQ for the teacher", () => {
    const qmap = new Map<string, BankQuestion>(questions.map((q) => [q.id, q]));
    const exam = { negativeMark: 0.25, items: [
      { questionId: "q_c9p_01", order: 1, marks: 1 },
      { questionId: "q_c9p_04", order: 2, marks: 1 },
      { questionId: "q_c9p_05", order: 3, marks: 1 },
      { questionId: "q_c9p_fb1", order: 4, marks: 1 },
      { questionId: "q_c9p_cq1", order: 5, marks: 10 },
    ] };
    const r = gradeAttempt(exam, qmap, { q_c9p_01: 1, q_c9p_04: 0, q_c9p_fb1: " M/S² " });
    expect(r.autoScore).toBe(1.75); // +1 -0.25 +0 (blank) +1
    expect(r.pendingManual).toBe(1);
    const f = applyManualMarks(r, { q_c9p_cq1: 8 });
    expect(f.autoScore).toBe(9.75);
    expect(f.pendingManual).toBe(0);
    const rep = topicReport(qmap, [f]);
    expect(rep[0]!.total).toBe(5);
  });
});

describe("lecture sheet + slides", () => {
  it("sample sheet passes validation and renders", () => {
    expect(validateSheet(sheet)).toEqual([]);
    const html = renderSheetHtml(sheet, { withTeacherNotes: true });
    expect(html).toContain("বেগ ও ত্বরণ");
    expect(html).toContain("টিচার নোট");
  });
  it("makes a deck with title first and a question before each worked example", () => {
    const slides = sheetToSlides(sheet);
    expect(slides[0]!.layout).toBe("title");
    const i = slides.findIndex((s) => s.layout === "steps");
    expect(slides[i - 1]!.layout).toBe("question");
    expect(slides.length).toBeGreaterThan(10);
  });
  it("every practice question id exists in the bank", () => {
    const ids = new Set(questions.map((q) => q.id));
    for (const b of sheet.blocks) if (b.kind === "practice") for (const id of b.questionIds) expect(ids.has(id)).toBe(true);
  });
});
