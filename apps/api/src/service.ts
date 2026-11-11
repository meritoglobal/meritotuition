/**
 * Marketplace service: enrollment, escrow, live sessions, attendance, flags,
 * refunds and teacher earnings. This in-memory version runs the whole flow for
 * development and tests; the Prisma repository (packages/db) replaces the maps
 * with the same method signatures.
 */
import { randomUUID } from "node:crypto";
import {
  DEMO_TEACHERS,
  classesPerMonth,
  commissionRate,
  escrowReleaseAt,
  evaluateAttendance,
  FLAG_WINDOW_HOURS,
  perClassShares,
  settleClass,
  shouldSuspend,
  upcomingOccurrences,
  type FlagRuling,
  type PresenceInterval,
  type SessionOutcome,
  type Settlement,
  type TeacherSummary,
  type WeeklySlot,
} from "@porao/core";
import { Ledger } from "./ledger";
import { Notifier } from "./notify";

export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export interface Student {
  id: string;
  name: string;
}

export interface Session {
  id: string;
  teacherId: string;
  slotId: string;
  scheduledStart: Date;
  durationMin: number;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  room: string;
  startedAt?: Date;
  endedAt?: Date;
  presence: { userId: string; join: Date; leave?: Date }[];
}

export interface Enrollment {
  id: string;
  studentId: string;
  teacherId: string;
  slotId: string;
  total: number;
  classCount: number;
  status: "PENDING_PAYMENT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  isTrial: boolean;
  createdAt: Date;
}

export interface Attendance {
  id: string;
  sessionId: string;
  enrollmentId: string;
  share: number;
  state: "SCHEDULED" | "HELD" | "DISPUTED" | "RELEASED" | "CANCELLED";
  outcome?: SessionOutcome;
  outcomeReason?: string;
  settlement?: Settlement;
  releaseAt?: Date;
}

export type FlagReason = "TEACHER_ABSENT" | "TEACHER_LATE" | "ENDED_EARLY" | "POOR_TEACHING" | "BEHAVIOUR" | "OTHER";
const ATTENDANCE_REASONS: FlagReason[] = ["TEACHER_ABSENT", "TEACHER_LATE", "ENDED_EARLY"];

export interface Flag {
  id: string;
  attendanceId: string;
  studentId: string;
  reason: FlagReason;
  details: string;
  status: "AUTO_RESOLVED" | "UNDER_REVIEW" | "UPHELD" | "PARTLY_UPHELD" | "REJECTED";
  evidence: string;
  ruling?: FlagRuling;
  createdAt: Date;
}

export class Marketplace {
  readonly ledger = new Ledger();
  readonly notifier = new Notifier();
  readonly teachers = new Map<string, TeacherSummary>();
  readonly students = new Map<string, Student>();
  readonly enrollments = new Map<string, Enrollment>();
  readonly sessions = new Map<string, Session>();
  readonly attendances = new Map<string, Attendance>();
  readonly flags = new Map<string, Flag>();
  readonly paidClasses = new Map<string, number>();
  readonly strikes = new Map<string, Date[]>();

  constructor(seed: TeacherSummary[] = DEMO_TEACHERS) {
    for (const t of seed) this.teachers.set(t.id, structuredClone(t));
  }

  // ───── lookups ─────

  teacher(id: string): TeacherSummary {
    const t = this.teachers.get(id);
    if (!t) throw new DomainError("NOT_FOUND", "Teacher not found", 404);
    return t;
  }

  slot(teacherId: string, slotId: string): WeeklySlot {
    const s = this.teacher(teacherId).routine.find((r) => r.id === slotId);
    if (!s) throw new DomainError("NOT_FOUND", "Routine slot not found", 404);
    return s;
  }

  addStudent(name: string, id: string = randomUUID()): Student {
    const s = { id, name };
    this.students.set(id, s);
    return s;
  }

  isSuspended(teacherId: string, now = new Date()): boolean {
    return shouldSuspend(this.strikes.get(teacherId) ?? [], now);
  }

  // ───── sessions ─────

  private sessionFor(teacherId: string, slot: WeeklySlot, start: Date): Session {
    for (const s of this.sessions.values()) {
      if (s.slotId === slot.id && s.teacherId === teacherId && s.scheduledStart.getTime() === start.getTime()) return s;
    }
    const s: Session = {
      id: randomUUID(),
      teacherId,
      slotId: slot.id,
      scheduledStart: start,
      durationMin: slot.durationMin,
      status: "SCHEDULED",
      room: `class-${teacherId}-${slot.id}-${start.getTime()}`,
      presence: [],
    };
    this.sessions.set(s.id, s);
    return s;
  }

  // ───── trial & enrollment ─────

  bookTrial(params: { studentId: string; teacherId: string; slotId: string; from?: Date }): { enrollment: Enrollment; session: Session } {
    const slot = this.slot(params.teacherId, params.slotId);
    if (slot.trialSeats <= 0 || slot.batchSize - slot.seatsTaken <= 0) {
      throw new DomainError("NO_TRIAL_SEAT", "No free trial seat in this batch");
    }
    for (const e of this.enrollments.values()) {
      if (e.isTrial && e.studentId === params.studentId && e.slotId === slot.id && e.teacherId === params.teacherId) {
        throw new DomainError("TRIAL_USED", "You already took the free trial for this batch");
      }
    }
    const [start] = upcomingOccurrences(slot, params.from ?? new Date(), 1);
    if (!start) throw new DomainError("NO_CLASS", "No upcoming class");
    const session = this.sessionFor(params.teacherId, slot, start);
    const enrollment: Enrollment = {
      id: randomUUID(),
      studentId: params.studentId,
      teacherId: params.teacherId,
      slotId: slot.id,
      total: 0,
      classCount: 1,
      status: "ACTIVE",
      isTrial: true,
      createdAt: new Date(),
    };
    this.enrollments.set(enrollment.id, enrollment);
    const trialAttendance: Attendance = { id: randomUUID(), sessionId: session.id, enrollmentId: enrollment.id, share: 0, state: "SCHEDULED" };
    this.attendances.set(trialAttendance.id, trialAttendance);
    slot.trialSeats -= 1;
    this.notifier.send({ userId: params.teacherId, kind: "TRIAL_BOOKED", title: "New free trial", body: `A student booked a free trial on ${start.toISOString()}` });
    return { enrollment, session };
  }

  enroll(params: { studentId: string; teacherId: string; slotId: string; from?: Date }): Enrollment {
    if (!this.students.has(params.studentId)) throw new DomainError("NOT_FOUND", "Student not found", 404);
    if (this.isSuspended(params.teacherId)) throw new DomainError("TEACHER_SUSPENDED", "This teacher is not taking students right now");
    const slot = this.slot(params.teacherId, params.slotId);
    if (slot.batchSize - slot.seatsTaken <= 0) throw new DomainError("BATCH_FULL", "This batch is full");

    const classCount = classesPerMonth(slot);
    const enrollment: Enrollment = {
      id: randomUUID(),
      studentId: params.studentId,
      teacherId: params.teacherId,
      slotId: slot.id,
      total: slot.monthlyPrice,
      classCount,
      status: "PENDING_PAYMENT",
      isTrial: false,
      createdAt: new Date(),
    };
    this.enrollments.set(enrollment.id, enrollment);

    const shares = perClassShares(slot.monthlyPrice, classCount);
    const starts = upcomingOccurrences(slot, params.from ?? new Date(), classCount);
    starts.forEach((start, i) => {
      const session = this.sessionFor(params.teacherId, slot, start);
      const a: Attendance = { id: randomUUID(), sessionId: session.id, enrollmentId: enrollment.id, share: shares[i] ?? 0, state: "SCHEDULED" };
      this.attendances.set(a.id, a);
    });
    return enrollment;
  }

  /** Gateway callback (SSLCommerz IPN / bKash execute). Money enters escrow. */
  confirmPayment(enrollmentId: string, gatewayTxnId: string): Enrollment {
    const e = this.enrollment(enrollmentId);
    if (e.status !== "PENDING_PAYMENT") throw new DomainError("ALREADY_PAID", "Enrollment is not awaiting payment");
    this.ledger.post("PAYMENT_IN", [
      { account: "gateway", amount: -e.total },
      { account: "escrow", amount: e.total },
    ], gatewayTxnId);
    e.status = "ACTIVE";
    this.slot(e.teacherId, e.slotId).seatsTaken += 1;
    this.notifier.send({ userId: e.studentId, kind: "PAYMENT", title: "Payment received", body: `৳${e.total} paid for ${e.classCount} classes.` });
    this.notifier.send({ userId: e.teacherId, kind: "PAYMENT", title: "New student enrolled", body: `A student enrolled for ${e.classCount} classes.` });
    return e;
  }

  enrollment(id: string): Enrollment {
    const e = this.enrollments.get(id);
    if (!e) throw new DomainError("NOT_FOUND", "Enrollment not found", 404);
    return e;
  }

  attendancesOf(enrollmentId: string): Attendance[] {
    return [...this.attendances.values()].filter((a) => a.enrollmentId === enrollmentId);
  }

  private activeAttendancesOfSession(sessionId: string): Attendance[] {
    return [...this.attendances.values()].filter((a) => {
      if (a.sessionId !== sessionId || a.state === "CANCELLED") return false;
      const e = this.enrollments.get(a.enrollmentId);
      return e?.status === "ACTIVE" || e?.status === "COMPLETED";
    });
  }

  // ───── live class ─────

  session(id: string): Session {
    const s = this.sessions.get(id);
    if (!s) throw new DomainError("NOT_FOUND", "Class not found", 404);
    return s;
  }

  /** One tap by the teacher: room opens, every enrolled student is notified. */
  startSession(sessionId: string, teacherId: string, now = new Date()): Session {
    const s = this.session(sessionId);
    if (s.teacherId !== teacherId) throw new DomainError("FORBIDDEN", "Not your class", 403);
    if (s.status === "ENDED" || s.status === "CANCELLED") throw new DomainError("CLASS_OVER", "This class has ended");
    if (s.status !== "LIVE") {
      s.status = "LIVE";
      s.startedAt = now;
      this.recordPresence(sessionId, teacherId, "JOIN", now);
      for (const a of this.activeAttendancesOfSession(sessionId)) {
        const e = this.enrollment(a.enrollmentId);
        this.notifier.send({
          userId: e.studentId,
          kind: "CLASS_STARTED",
          title: "Class started",
          body: `${this.teacher(teacherId).name} started your class. Tap to join.`,
          data: { sessionId },
        });
      }
    }
    return s;
  }

  canJoin(sessionId: string, userId: string): boolean {
    const s = this.session(sessionId);
    if (s.teacherId === userId) return true;
    return this.activeAttendancesOfSession(sessionId).some((a) => this.enrollments.get(a.enrollmentId)?.studentId === userId);
  }

  /** Join/leave events from LiveKit webhooks (participant_joined / participant_left). */
  recordPresence(sessionId: string, userId: string, kind: "JOIN" | "LEAVE", at: Date): void {
    const s = this.session(sessionId);
    if (kind === "JOIN") {
      if (!s.presence.some((p) => p.userId === userId && !p.leave)) s.presence.push({ userId, join: at });
    } else {
      const open = s.presence.find((p) => p.userId === userId && !p.leave);
      if (open) open.leave = at;
    }
  }

  /** Room finished (LiveKit room_finished, or the scheduled end + grace). Decide each student's outcome. */
  endSession(sessionId: string, at: Date): Attendance[] {
    const s = this.session(sessionId);
    if (s.status === "ENDED") return this.activeAttendancesOfSession(sessionId);
    s.status = "ENDED";
    s.endedAt = at;
    for (const p of s.presence) p.leave ??= at;
    const intervals = (uid: string): PresenceInterval[] =>
      s.presence.filter((p) => p.userId === uid).map((p) => ({ join: p.join, leave: p.leave ?? at }));

    const rate = commissionRate(this.paidClasses.get(s.teacherId) ?? 0);
    const results: Attendance[] = [];
    let teacherNoShow = false;
    for (const a of this.activeAttendancesOfSession(sessionId)) {
      const e = this.enrollment(a.enrollmentId);
      const r = evaluateAttendance({
        scheduledStart: s.scheduledStart,
        durationMin: s.durationMin,
        teacher: intervals(s.teacherId),
        student: intervals(e.studentId),
      });
      a.outcome = r.outcome;
      a.outcomeReason = r.reason;
      a.settlement = settleClass({ classShare: a.share, outcome: r.outcome, commissionRate: rate });
      a.state = "HELD";
      a.releaseAt = escrowReleaseAt(at);
      if (r.outcome === "TEACHER_NO_SHOW") teacherNoShow = true;
      results.push(a);
    }
    if (teacherNoShow) {
      const list = this.strikes.get(s.teacherId) ?? [];
      list.push(at);
      this.strikes.set(s.teacherId, list);
    }
    return results;
  }

  // ───── escrow release ─────

  private release(a: Attendance): void {
    const e = this.enrollment(a.enrollmentId);
    const st = a.settlement;
    if (!st) throw new DomainError("NOT_SETTLED", "Class not settled yet");
    if (a.share > 0) {
      this.ledger.post(
        "CLASS_RELEASE",
        [
          { account: "escrow", amount: -a.share },
          { account: `wallet:${e.teacherId}`, amount: st.teacherNet },
          { account: "platform_revenue", amount: st.platform },
          { account: `wallet:${e.studentId}`, amount: st.refund },
        ],
        a.id,
      );
      if (st.teacherGross > 0) this.paidClasses.set(e.teacherId, (this.paidClasses.get(e.teacherId) ?? 0) + 1);
    }
    a.state = "RELEASED";
    if (this.attendancesOf(e.id).every((x) => x.state === "RELEASED" || x.state === "CANCELLED") && e.status === "ACTIVE") {
      e.status = "COMPLETED";
    }
  }

  /** Run by a BullMQ repeat job every few minutes. */
  releaseDue(now: Date): number {
    let n = 0;
    for (const a of this.attendances.values()) {
      if (a.state === "HELD" && a.releaseAt && a.releaseAt <= now) {
        this.release(a);
        n++;
      }
    }
    return n;
  }

  // ───── flags ─────

  raiseFlag(params: { attendanceId: string; studentId: string; reason: FlagReason; details: string; now?: Date }): Flag {
    const now = params.now ?? new Date();
    const a = this.attendances.get(params.attendanceId);
    if (!a) throw new DomainError("NOT_FOUND", "Class record not found", 404);
    const e = this.enrollment(a.enrollmentId);
    if (e.studentId !== params.studentId) throw new DomainError("FORBIDDEN", "Not your class", 403);
    if (a.state !== "HELD") throw new DomainError("FLAG_CLOSED", `This class can be flagged only within ${FLAG_WINDOW_HOURS} hours of it ending`);
    if (a.releaseAt && now > a.releaseAt) throw new DomainError("FLAG_CLOSED", `Flag window of ${FLAG_WINDOW_HOURS} hours has passed`);

    const attendanceClaim = ATTENDANCE_REASONS.includes(params.reason);
    const evidenceAgrees = a.outcome === "TEACHER_NO_SHOW" || a.outcome === "TEACHER_LATE_OR_SHORT";
    const flag: Flag = {
      id: randomUUID(),
      attendanceId: a.id,
      studentId: params.studentId,
      reason: params.reason,
      details: params.details,
      status: attendanceClaim && evidenceAgrees ? "AUTO_RESOLVED" : "UNDER_REVIEW",
      evidence: a.outcomeReason ?? "No attendance data",
      createdAt: now,
    };
    this.flags.set(flag.id, flag);
    if (flag.status === "UNDER_REVIEW") a.state = "DISPUTED"; // pause release until admin rules
    this.notifier.send({
      userId: params.studentId,
      kind: "FLAG_UPDATE",
      title: flag.status === "AUTO_RESOLVED" ? "Refund confirmed" : "Complaint received",
      body:
        flag.status === "AUTO_RESOLVED"
          ? `Class record confirms it (${flag.evidence}). ৳${a.settlement?.refund ?? 0} goes back to you.`
          : "Our team will review it within 72 hours.",
    });
    return flag;
  }

  ruleFlag(flagId: string, ruling: FlagRuling, now = new Date()): Flag {
    const f = this.flags.get(flagId);
    if (!f) throw new DomainError("NOT_FOUND", "Flag not found", 404);
    if (f.status !== "UNDER_REVIEW") throw new DomainError("ALREADY_DECIDED", "Flag already decided");
    const a = this.attendances.get(f.attendanceId);
    if (!a?.outcome) throw new DomainError("NOT_SETTLED", "Class not settled");
    const e = this.enrollment(a.enrollmentId);
    a.settlement = settleClass({
      classShare: a.share,
      outcome: a.outcome,
      commissionRate: commissionRate(this.paidClasses.get(e.teacherId) ?? 0),
      flagRuling: ruling,
    });
    f.ruling = ruling;
    f.status = ruling === 1 ? "REJECTED" : ruling === 0 ? "UPHELD" : "PARTLY_UPHELD";
    a.state = "HELD";
    a.releaseAt = now;
    this.release(a);
    this.notifier.send({ userId: f.studentId, kind: "FLAG_UPDATE", title: "Complaint decided", body: `Refund: ৳${a.settlement.refund}.` });
    return f;
  }

  // ───── cancel ─────

  cancelEnrollment(enrollmentId: string, by: "STUDENT" | "TEACHER" | "ADMIN"): { refunded: number; refundedClasses: number } {
    const e = this.enrollment(enrollmentId);
    if (e.status !== "ACTIVE") throw new DomainError("NOT_ACTIVE", "Enrollment is not active");
    let refunded = 0;
    let refundedClasses = 0;
    for (const a of this.attendancesOf(e.id)) {
      if (a.state !== "SCHEDULED") continue; // held/disputed classes settle by their own rules
      if (a.share > 0) {
        this.ledger.post("REFUND", [
          { account: "escrow", amount: -a.share },
          { account: `wallet:${e.studentId}`, amount: a.share },
        ], a.id);
      }
      refunded += a.share;
      refundedClasses += 1;
      a.state = "CANCELLED";
    }
    e.status = "CANCELLED";
    const slot = this.slot(e.teacherId, e.slotId);
    slot.seatsTaken = Math.max(0, slot.seatsTaken - 1);
    this.notifier.send({ userId: e.studentId, kind: "PAYMENT", title: "Plan stopped", body: `৳${refunded} for ${refundedClasses} classes returned (by ${by.toLowerCase()}).` });
    return { refunded, refundedClasses };
  }

  // ───── dashboards ─────

  /** Teacher sees gross, our commission, and what is pending/available. */
  teacherEarnings(teacherId: string) {
    let gross = 0;
    let commission = 0;
    let net = 0;
    let pendingNet = 0;
    let lostToFlags = 0;
    const classes: { sessionId: string; date: Date; outcome?: SessionOutcome; state: Attendance["state"]; gross: number; commission: number; net: number }[] = [];
    for (const a of this.attendances.values()) {
      const e = this.enrollments.get(a.enrollmentId);
      if (!e || e.teacherId !== teacherId || !a.settlement || e.isTrial) continue;
      const s = this.session(a.sessionId);
      const st = a.settlement;
      if (a.state === "RELEASED") {
        gross += st.teacherGross;
        commission += st.platform;
        net += st.teacherNet;
        lostToFlags += st.refund;
      } else {
        pendingNet += st.teacherNet;
      }
      classes.push({ sessionId: s.id, date: s.scheduledStart, outcome: a.outcome, state: a.state, gross: st.teacherGross, commission: st.platform, net: st.teacherNet });
    }
    const paidClasses = this.paidClasses.get(teacherId) ?? 0;
    return {
      gross,
      commission,
      net,
      pendingNet,
      lostToFlags,
      available: this.ledger.balance(`wallet:${teacherId}`),
      paidOut: -this.ledger.sumByKind(`wallet:${teacherId}`, "PAYOUT"),
      commissionRate: commissionRate(paidClasses),
      paidClasses,
      classes: classes.sort((x, y) => y.date.getTime() - x.date.getTime()),
    };
  }

  /** Student view: what they paid and got back. Commission is never exposed here. */
  studentPlan(enrollmentId: string) {
    const e = this.enrollment(enrollmentId);
    const list = this.attendancesOf(e.id).map((a) => {
      const s = this.session(a.sessionId);
      return {
        attendanceId: a.id,
        sessionId: s.id,
        start: s.scheduledStart,
        status: s.status,
        price: a.share,
        refunded: a.state === "CANCELLED" ? a.share : (a.settlement?.refund ?? 0),
        outcome: a.outcome,
        canFlag: a.state === "HELD",
      };
    });
    return { id: e.id, teacherId: e.teacherId, status: e.status, paid: e.total, classCount: e.classCount, credit: this.ledger.balance(`wallet:${e.studentId}`), classes: list };
  }

  requestPayout(teacherId: string, amount: number, method: "BKASH" | "BANK"): void {
    if (amount <= 0 || amount > this.ledger.balance(`wallet:${teacherId}`)) throw new DomainError("INSUFFICIENT", "Not enough available balance");
    this.ledger.post("PAYOUT", [
      { account: `wallet:${teacherId}`, amount: -amount },
      { account: "payout", amount },
    ], `${method}:${teacherId}`);
    this.notifier.send({ userId: teacherId, kind: "PAYOUT", title: "Payout sent", body: `৳${amount} sent to your ${method === "BKASH" ? "bKash" : "bank"}.` });
  }
}
