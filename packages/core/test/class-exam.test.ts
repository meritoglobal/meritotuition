import { describe, expect, it } from "vitest";
import { gradeExam, studentView, validateExam, type ExamQuestion } from "../src/class-exam";

const qs: ExamQuestion[] = [
  { id: "a", kind: "mcq", prompt: "1+1?", options: ["1", "2", "3"], answer: 1, marks: 1 },
  { id: "b", kind: "mcq", prompt: "2+2?", options: ["4", "5"], answer: 0, marks: 2 },
  { id: "c", kind: "written", prompt: "Explain inertia", marks: 5 },
];

describe("class exams", () => {
  it("marks MCQ instantly and waits for written marks", () => {
    const r = gradeExam(qs, { a: 1, b: 1, c: "..." });
    expect(r).toMatchObject({ autoScore: 1, total: 1, maxMarks: 8, checked: false });
  });
  it("adds clamped tutor marks and becomes checked", () => {
    const r = gradeExam(qs, { a: 1, b: 0 }, { c: 9 });
    expect(r).toMatchObject({ autoScore: 3, total: 8, checked: true, manual: { c: 5 } });
    expect(gradeExam(qs, {}, { c: -2 }).manual.c).toBe(0);
  });
  it("an MCQ-only paper is checked at once", () => {
    expect(gradeExam(qs.slice(0, 2), { a: 1 }).checked).toBe(true);
  });
  it("hides the answer key from students", () => {
    expect(studentView(qs).every((q) => !("answer" in q))).toBe(true);
  });
  it("validates drafts", () => {
    expect(validateExam(qs)).toEqual([]);
    expect(validateExam([])).toEqual(["no-questions"]);
    const bad: ExamQuestion[] = [{ id: "x", kind: "mcq", prompt: "", options: ["a", "b", "c", "d", "e", "f"], answer: 7, marks: 0 }];
    expect(validateExam(bad)).toEqual(["q1:prompt", "q1:marks", "q1:options", "q1:answer"]);
  });
});
