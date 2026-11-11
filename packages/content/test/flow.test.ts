import { describe, expect, it } from "vitest";
import { seedLibrary } from "../content";

const T = "topic_c9_phy_ch2_t2";
describe("teacher -> exam -> students flow", () => {
  it("one click exam, assign to batch, students submit, teacher grades CQ, report", () => {
    const lib = seedLibrary();
    expect(lib.listTopics({ trackCode: "CLASS_9" })[0]).toMatchObject({ hasSheet: true, questionCount: 17 });
    expect(lib.slides(T).length).toBeGreaterThan(10);

    const exam = lib.makeExam({ teacherId: "t1", topicIds: [T], preset: "CLASS_TEST", seed: 7 });
    expect(exam.items.length).toBe(13); // bank has 12 MCQ, preset wants 15
    expect(exam.shortfalls).toEqual([{ type: "MCQ", wanted: 15, got: 12 }]);
    expect(exam.totalMarks).toBe(22);

    const now = new Date("2026-11-12T10:00:00Z");
    const a = lib.assign({ examId: exam.id, teacherId: "t1", slotId: "slot1", studentIds: ["s1", "s2"], opensAt: now, closesAt: new Date(now.getTime() + 3600e3), mode: "LIVE" });
    expect(lib.studentInbox("s1", now)[0]!.state).toBe("OPEN");

    const paper = lib.paper(a.id, "s1", now);
    expect(JSON.stringify(paper)).not.toContain("explanation");
    expect(JSON.stringify(paper)).not.toContain("modelAnswer");

    // s1 answers every MCQ correctly, s2 leaves everything blank
    const correct: Record<string, number> = {};
    for (const it of exam.items) { const q = lib.questions.get(it.questionId)!; if (q.type === "MCQ") correct[q.id] = (q.body as { answer: number }).answer; }
    const r1 = lib.submit(a.id, "s1", correct, now);
    expect(r1.autoScore).toBe(12);
    expect(r1.pendingManual).toBe(1);
    expect(() => lib.submit(a.id, "s1", correct, now)).toThrow(/আগেই/);
    lib.submit(a.id, "s2", {}, now);

    const res = lib.results(a.id, "t1");
    const cqId = exam.items.find((i) => lib.questions.get(i.questionId)!.type === "CQ")!.questionId;
    const g = lib.gradeManual(res.students[0]!.attemptId!, "t1", { [cqId]: 9 });
    expect(g.autoScore).toBe(21);
    expect(lib.results(a.id, "t1").topics[0]!.title).toBe("বেগ ও ত্বরণ");
    expect(() => lib.results(a.id, "t2")).toThrow();
  });

  it("teacher can swap a question and keep an edited copy of the sheet", () => {
    const lib = seedLibrary();
    const exam = lib.makeExam({ teacherId: "t1", topicIds: [T], preset: "QUICK_QUIZ", seed: 1 });
    const before = exam.items[0]!.questionId;
    lib.swapQuestion(exam.id, "t1", before);
    expect(exam.items[0]!.questionId).not.toBe(before);

    const body = { ...lib.getSheet(T).body, topic: "বেগ ও ত্বরণ (আমার নোট)" };
    lib.saveTeacherSheet(T, "t1", body);
    expect(lib.getSheet(T, "t1").owner).toBe("TEACHER");
    expect(lib.getSheet(T, "t2").owner).toBe("PLATFORM");
  });
});
