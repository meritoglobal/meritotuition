/** HTTP API used by the website and the mobile app. */
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { BATCH_SIZES, CLASS_LEVELS, DEMO_VIDEOS, SUBJECTS, roomState, searchTeachers, teacherReceives, type BatchSize } from "@merito/core";
import { roomToken } from "./livekit";
import { DomainError, Marketplace } from "./service";

const id = z.string().min(1);

export function buildApp(market = new Marketplace()): FastifyInstance {
  const app = Fastify({ logger: false });
  void app.register(cors, { origin: true });

  // Auth placeholder: phone OTP will issue a JWT; for now the caller sends x-user-id.
  const userOf = (headers: Record<string, unknown>): string => {
    const u = headers["x-user-id"];
    if (typeof u !== "string" || !u) throw new DomainError("UNAUTHENTICATED", "Sign in first", 401);
    return u;
  };

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof DomainError) return reply.status(err.status).send({ error: err.code, message: err.message });
    if (err instanceof z.ZodError) return reply.status(400).send({ error: "BAD_REQUEST", message: err.issues.map((i) => i.message).join("; ") });
    return reply.status(500).send({ error: "INTERNAL", message: err instanceof Error ? err.message : String(err) });
  });

  app.get("/health", async () => ({ ok: true }));

  // ───── discovery ─────

  app.get("/teachers", async (req) => {
    const q = z
      .object({
        subjects: z.string().optional(),
        level: z.enum(CLASS_LEVELS).optional(),
        mode: z.enum(["ONLINE", "OFFLINE"]).optional(),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        maxKm: z.coerce.number().optional(),
        university: z.string().optional(),
        maxPrice: z.coerce.number().optional(),
        batchSize: z.coerce.number().optional(),
        freeTrial: z.enum(["true", "false"]).optional(),
        q: z.string().optional(),
      })
      .parse(req.query);
    const subjects = q.subjects?.split(",").filter((s): s is (typeof SUBJECTS)[number] => (SUBJECTS as readonly string[]).includes(s));
    const hits = searchTeachers([...market.teachers.values()].filter((t) => !market.isSuspended(t.id)), {
      subjects,
      level: q.level,
      mode: q.mode,
      near: q.lat !== undefined && q.lng !== undefined ? { lat: q.lat, lng: q.lng } : undefined,
      maxDistanceKm: q.maxKm,
      university: q.university,
      maxPrice: q.maxPrice,
      batchSize: BATCH_SIZES.includes(q.batchSize as BatchSize) ? (q.batchSize as BatchSize) : undefined,
      freeTrialOnly: q.freeTrial === "true",
      text: q.q,
    });
    return { results: hits.map((h) => ({ ...h.teacher, distanceKm: h.distanceKm, score: h.score })) };
  });

  app.get("/teachers/:id", async (req) => {
    const { id: tid } = z.object({ id }).parse(req.params);
    const t = market.teacher(tid);
    return { ...t, videos: DEMO_VIDEOS.filter((v) => v.teacherId === tid) };
  });

  app.get("/videos", async () => ({ results: DEMO_VIDEOS }));

  // ───── booking ─────

  app.post("/trials", async (req) => {
    const body = z.object({ teacherId: id, slotId: id }).parse(req.body);
    const studentId = userOf(req.headers);
    const { enrollment, session } = market.bookTrial({ studentId, ...body });
    return { enrollmentId: enrollment.id, sessionId: session.id, start: session.scheduledStart };
  });

  app.post("/enrollments", async (req) => {
    const body = z.object({ teacherId: id, slotId: id }).parse(req.body);
    const studentId = userOf(req.headers);
    if (!market.students.has(studentId)) market.addStudent("Student", studentId);
    const e = market.enroll({ studentId, ...body });
    // Production: create an SSLCommerz / bKash session and return its redirect URL.
    return { enrollmentId: e.id, amount: e.total, classCount: e.classCount, paymentUrl: `/pay/${e.id}` };
  });

  /** Payment gateway IPN. Production verifies the gateway signature and amount first. */
  app.post("/payments/callback", async (req) => {
    const body = z.object({ enrollmentId: id, gatewayTxnId: id }).parse(req.body);
    const e = market.confirmPayment(body.enrollmentId, body.gatewayTxnId);
    return { status: e.status };
  });

  app.get("/enrollments/:id", async (req) => {
    const { id: eid } = z.object({ id }).parse(req.params);
    const plan = market.studentPlan(eid);
    if (plan && market.enrollment(eid).studentId !== userOf(req.headers)) throw new DomainError("FORBIDDEN", "Not your plan", 403);
    return plan;
  });

  app.post("/enrollments/:id/cancel", async (req) => {
    const { id: eid } = z.object({ id }).parse(req.params);
    const user = userOf(req.headers);
    const e = market.enrollment(eid);
    const by = e.studentId === user ? "STUDENT" : e.teacherId === user ? "TEACHER" : null;
    if (!by) throw new DomainError("FORBIDDEN", "Not your plan", 403);
    return market.cancelEnrollment(eid, by);
  });

  // ───── live class ─────

  app.get("/sessions/:id/room", async (req) => {
    const { id: sid } = z.object({ id }).parse(req.params);
    const user = userOf(req.headers);
    if (!market.canJoin(sid, user)) throw new DomainError("FORBIDDEN", "You are not in this class", 403);
    const s = market.session(sid);
    return {
      state: roomState({ now: new Date(), start: s.scheduledStart, durationMin: s.durationMin, teacherStarted: s.status === "LIVE", ended: s.status === "ENDED" }),
      start: s.scheduledStart,
      durationMin: s.durationMin,
    };
  });

  app.post("/sessions/:id/start", async (req) => {
    const { id: sid } = z.object({ id }).parse(req.params);
    const teacherId = userOf(req.headers);
    const s = market.startSession(sid, teacherId);
    const t = market.teacher(teacherId);
    return { session: s.id, ...(await roomToken({ room: s.room, identity: teacherId, name: t.name, isTeacher: true })) };
  });

  app.post("/sessions/:id/join", async (req) => {
    const { id: sid } = z.object({ id }).parse(req.params);
    const user = userOf(req.headers);
    if (!market.canJoin(sid, user)) throw new DomainError("FORBIDDEN", "You are not in this class", 403);
    const s = market.session(sid);
    if (s.status !== "LIVE") throw new DomainError("WAITING_FOR_TEACHER", "The teacher has not started the class yet", 409);
    return { session: s.id, ...(await roomToken({ room: s.room, identity: user, name: market.students.get(user)?.name ?? "Student", isTeacher: false })) };
  });

  /**
   * LiveKit webhook. Production verifies the signature with WebhookReceiver.
   * participant_joined / participant_left feed attendance; room_finished settles.
   */
  app.post("/webhooks/livekit", async (req) => {
    const body = z
      .object({
        event: z.enum(["participant_joined", "participant_left", "room_finished"]),
        sessionId: id,
        identity: z.string().optional(),
        at: z.coerce.date().optional(),
      })
      .parse(req.body);
    const at = body.at ?? new Date();
    if (body.event === "room_finished") return { settled: market.endSession(body.sessionId, at).length };
    if (!body.identity) throw new DomainError("BAD_REQUEST", "identity required");
    market.recordPresence(body.sessionId, body.identity, body.event === "participant_joined" ? "JOIN" : "LEAVE", at);
    return { ok: true };
  });

  // ───── flags ─────

  app.post("/flags", async (req) => {
    const body = z
      .object({
        attendanceId: id,
        reason: z.enum(["TEACHER_ABSENT", "TEACHER_LATE", "ENDED_EARLY", "POOR_TEACHING", "BEHAVIOUR", "OTHER"]),
        details: z.string().max(2000).default(""),
      })
      .parse(req.body);
    const f = market.raiseFlag({ ...body, studentId: userOf(req.headers) });
    return { id: f.id, status: f.status, evidence: f.evidence };
  });

  app.get("/admin/flags", async () => ({ results: [...market.flags.values()].filter((f) => f.status === "UNDER_REVIEW") }));

  app.post("/admin/flags/:id/rule", async (req) => {
    const { id: fid } = z.object({ id }).parse(req.params);
    const { ruling } = z.object({ ruling: z.union([z.literal(0), z.literal(0.5), z.literal(1)]) }).parse(req.body);
    const f = market.ruleFlag(fid, ruling);
    return { status: f.status };
  });

  // ───── teacher money ─────

  app.get("/teachers/:id/earnings", async (req) => {
    const { id: tid } = z.object({ id }).parse(req.params);
    if (userOf(req.headers) !== tid) throw new DomainError("FORBIDDEN", "Only the teacher can see earnings", 403);
    return market.teacherEarnings(tid);
  });

  app.get("/pricing/preview", async (req) => {
    const q = z.object({ price: z.coerce.number().int().positive(), paidClasses: z.coerce.number().int().min(0).default(0) }).parse(req.query);
    return teacherReceives(q.price, q.paidClasses);
  });

  app.post("/payouts", async (req) => {
    const body = z.object({ amount: z.number().int().positive(), method: z.enum(["BKASH", "BANK"]) }).parse(req.body);
    const teacherId = userOf(req.headers);
    market.requestPayout(teacherId, body.amount, body.method);
    return { available: market.ledger.balance(`wallet:${teacherId}`) };
  });

  app.get("/me/notifications", async (req) => ({ results: market.notifier.forUser(userOf(req.headers)).slice(-50).reverse() }));

  return app;
}
