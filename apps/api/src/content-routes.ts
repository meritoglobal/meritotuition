/**
 * Teacher content + exam routes. Wire in app.ts:
 *   registerContentRoutes(app, seedLibrary(), { userOf, studentsOfSlot: (slotId) => market.activeStudentIds(slotId) });
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ContentError, ContentLibrary, PRESETS, SEGMENTS, SUBJECTS } from "@mastermoshai/content";

interface Deps {
  userOf: (headers: Record<string, unknown>) => string;
  /** Student ids with an ACTIVE Enrollment in this RoutineSlot, after checking the slot belongs to teacherId. */
  studentsOfSlot: (slotId: string, teacherId: string) => string[];
}

export function registerContentRoutes(app: FastifyInstance, lib: ContentLibrary, deps: Deps) {
  const id = z.string().min(1);
  app.addHook("onError", async (_req, reply, err) => {
    if (err instanceof ContentError) reply.status(err.status).send({ error: err.code, message: err.message });
  });

  // curriculum tree + presets
  app.get("/content/taxonomy", async () => ({ segments: SEGMENTS, subjects: SUBJECTS, presets: Object.keys(PRESETS) }));
  app.get("/content/topics", async (req) => {
    const q = z.object({ track: z.string().optional(), subject: z.string().optional() }).parse(req.query);
    return { results: lib.listTopics({ trackCode: q.track, subjectCode: q.subject }) };
  });

  // lecture sheets + slides
  app.get("/content/topics/:topicId/sheet", async (req) => {
    const { topicId } = z.object({ topicId: id }).parse(req.params);
    return lib.getSheet(topicId, req.headers["x-user-id"] as string | undefined);
  });
  app.get("/content/topics/:topicId/sheet.html", async (req, reply) => {
    const { topicId } = z.object({ topicId: id }).parse(req.params);
    const { notes } = z.object({ notes: z.enum(["0", "1"]).optional() }).parse(req.query);
    reply.type("text/html; charset=utf-8");
    return lib.sheetHtml(topicId, req.headers["x-user-id"] as string | undefined, undefined, notes === "1");
  });
  app.put("/content/topics/:topicId/sheet", async (req) => {
    const { topicId } = z.object({ topicId: id }).parse(req.params);
    return lib.saveTeacherSheet(topicId, deps.userOf(req.headers), z.any().parse(req.body));
  });
  app.get("/content/topics/:topicId/slides", async (req) => {
    const { topicId } = z.object({ topicId: id }).parse(req.params);
    return { slides: lib.slides(topicId, req.headers["x-user-id"] as string | undefined) };
  });

  // one-click exam
  app.post("/exams", async (req) => {
    const b = z.object({ topicIds: z.array(id).min(1), preset: z.enum(Object.keys(PRESETS) as [string, ...string[]]).default("CLASS_TEST"), title: z.string().optional(), seed: z.number().int().optional() }).parse(req.body);
    const teacherId = deps.userOf(req.headers);
    return lib.makeExam({ teacherId, ...b, preset: b.preset as keyof typeof PRESETS, avoidRecentFor: teacherId });
  });
  app.post("/exams/:examId/swap", async (req) => {
    const { examId } = z.object({ examId: id }).parse(req.params);
    const { questionId } = z.object({ questionId: id }).parse(req.body);
    return lib.swapQuestion(examId, deps.userOf(req.headers), questionId);
  });
  app.post("/exams/:examId/assign", async (req) => {
    const { examId } = z.object({ examId: id }).parse(req.params);
    const b = z.object({ slotId: id.optional(), studentIds: z.array(id).optional(), opensAt: z.coerce.date(), closesAt: z.coerce.date(), mode: z.enum(["LIVE", "PRACTICE", "HOMEWORK"]).optional() }).parse(req.body);
    const teacherId = deps.userOf(req.headers);
    const studentIds = b.slotId ? deps.studentsOfSlot(b.slotId, teacherId) : b.studentIds ?? [];
    return lib.assign({ examId, teacherId, slotId: b.slotId, studentIds, opensAt: b.opensAt, closesAt: b.closesAt, mode: b.mode });
  });
  app.get("/assignments/:assignmentId/results", async (req) => {
    const { assignmentId } = z.object({ assignmentId: id }).parse(req.params);
    return lib.results(assignmentId, deps.userOf(req.headers));
  });
  app.post("/attempts/:attemptId/grade", async (req) => {
    const { attemptId } = z.object({ attemptId: id }).parse(req.params);
    const marks = z.record(z.number()).parse(req.body);
    return lib.gradeManual(attemptId, deps.userOf(req.headers), marks);
  });

  // student side
  app.get("/me/exams", async (req) => ({ results: lib.studentInbox(deps.userOf(req.headers)) }));
  app.get("/me/exams/:assignmentId", async (req) => {
    const { assignmentId } = z.object({ assignmentId: id }).parse(req.params);
    return lib.paper(assignmentId, deps.userOf(req.headers));
  });
  app.post("/me/exams/:assignmentId/submit", async (req) => {
    const { assignmentId } = z.object({ assignmentId: id }).parse(req.params);
    const { answers } = z.object({ answers: z.record(z.any()) }).parse(req.body);
    return lib.submit(assignmentId, deps.userOf(req.headers), answers);
  });
}
