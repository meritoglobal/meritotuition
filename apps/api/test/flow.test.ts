import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { Marketplace } from "../src/service";

const T = "t-rafi"; // Physics 1:3 online, Sun/Tue/Thu 5 PM, ৳3000 for 12 classes
const from = new Date("2026-11-14T00:00:00Z");

function setup() {
  const m = new Marketplace();
  const student = m.addStudent("Ayan", "st-ayan");
  const e = m.enroll({ studentId: student.id, teacherId: T, slotId: "s1", from });
  m.confirmPayment(e.id, "sslcz-123");
  return { m, student, e };
}

describe("end-to-end escrow flow", () => {
  it("payment goes into escrow and the seat is taken", () => {
    const { m, e } = setup();
    expect(e.classCount).toBe(12);
    expect(m.ledger.balance("escrow")).toBe(3000);
    expect(m.slot(T, "s1").seatsTaken).toBe(2);
  });

  it("completed class releases 250 per class after 48 hours: teacher 188, platform 62", () => {
    const { m, e } = setup();
    const first = m.attendancesOf(e.id)[0]!;
    const s = m.session(first.sessionId);
    const at = (min: number) => new Date(s.scheduledStart.getTime() + min * 60_000);
    m.startSession(s.id, T, at(-1));
    m.recordPresence(s.id, "st-ayan", "JOIN", at(2));
    expect(m.notifier.forUser("st-ayan").some((n) => n.kind === "CLASS_STARTED")).toBe(true);
    m.endSession(s.id, at(60));
    expect(first.outcome).toBe("COMPLETED");
    expect(m.releaseDue(at(60 + 47 * 60))).toBe(0); // still inside flag window
    expect(m.releaseDue(at(60 + 48 * 60))).toBe(1);
    expect(m.ledger.balance(`wallet:${T}`)).toBe(188);
    expect(m.ledger.balance("platform_revenue")).toBe(62);
    expect(m.ledger.balance("escrow")).toBe(2750);
    const earn = m.teacherEarnings(T);
    expect(earn).toMatchObject({ gross: 250, commission: 62, net: 188, available: 188 });
    // Student view never contains commission
    expect(JSON.stringify(m.studentPlan(e.id))).not.toMatch(/commission|platform/i);
  });

  it("teacher no-show: automatic flag refund and a strike", () => {
    const { m, e } = setup();
    const a = m.attendancesOf(e.id)[0]!;
    const s = m.session(a.sessionId);
    const at = (min: number) => new Date(s.scheduledStart.getTime() + min * 60_000);
    m.recordPresence(s.id, "st-ayan", "JOIN", at(0));
    m.endSession(s.id, at(30));
    const f = m.raiseFlag({ attendanceId: a.id, studentId: "st-ayan", reason: "TEACHER_ABSENT", details: "", now: at(40) });
    expect(f.status).toBe("AUTO_RESOLVED");
    m.releaseDue(at(60 * 49));
    expect(m.ledger.balance("wallet:st-ayan")).toBe(250);
    expect(m.ledger.balance(`wallet:${T}`)).toBe(0);
    expect(m.strikes.get(T)?.length).toBe(1);
  });

  it("subjective flag waits for admin; 50% ruling splits the class", () => {
    const { m, e } = setup();
    const a = m.attendancesOf(e.id)[0]!;
    const s = m.session(a.sessionId);
    const at = (min: number) => new Date(s.scheduledStart.getTime() + min * 60_000);
    m.startSession(s.id, T, at(0));
    m.recordPresence(s.id, "st-ayan", "JOIN", at(0));
    m.endSession(s.id, at(60));
    const f = m.raiseFlag({ attendanceId: a.id, studentId: "st-ayan", reason: "POOR_TEACHING", details: "Did not explain", now: at(120) });
    expect(f.status).toBe("UNDER_REVIEW");
    expect(m.releaseDue(at(60 * 72))).toBe(0); // disputed: not released
    m.ruleFlag(f.id, 0.5, at(60 * 72));
    expect(m.ledger.balance("wallet:st-ayan")).toBe(125);
    expect(m.ledger.balance(`wallet:${T}`)).toBe(94);
    expect(m.ledger.balance("platform_revenue")).toBe(31);
  });

  it("stopping after 2 classes refunds the other 10", () => {
    const { m, e } = setup();
    for (const a of m.attendancesOf(e.id).slice(0, 2)) {
      const s = m.session(a.sessionId);
      const at = (min: number) => new Date(s.scheduledStart.getTime() + min * 60_000);
      m.startSession(s.id, T, at(0));
      m.recordPresence(s.id, "st-ayan", "JOIN", at(1));
      m.endSession(s.id, at(60));
    }
    const r = m.cancelEnrollment(e.id, "STUDENT");
    expect(r).toEqual({ refunded: 2500, refundedClasses: 10 });
    m.releaseDue(new Date("2026-12-31T00:00:00Z"));
    expect(m.ledger.balance(`wallet:${T}`)).toBe(376);
    expect(m.ledger.balance("escrow")).toBe(0);
    // Every taka reconciles
    expect(m.ledger.balance(`wallet:${T}`) + m.ledger.balance("platform_revenue") + m.ledger.balance("wallet:st-ayan")).toBe(3000);
  });
});

describe("HTTP API", () => {
  it("searches offline tutors near Farmgate", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/teachers?mode=OFFLINE&lat=23.7577&lng=90.3897&subjects=Physics" });
    expect(res.statusCode).toBe(200);
    expect(res.json().results.map((t: { id: string }) => t.id)).toContain("t-rafi");
  });

  it("enroll, pay, start class, join, flag over HTTP", async () => {
    const m = new Marketplace();
    const app = buildApp(m);
    const h = { "x-user-id": "st-1" };
    const enr = (await app.inject({ method: "POST", url: "/enrollments", headers: h, payload: { teacherId: T, slotId: "s1" } })).json();
    expect(enr.amount).toBe(3000);
    await app.inject({ method: "POST", url: "/payments/callback", payload: { enrollmentId: enr.enrollmentId, gatewayTxnId: "x1" } });
    const plan = (await app.inject({ method: "GET", url: `/enrollments/${enr.enrollmentId}`, headers: h })).json();
    const sid = plan.classes[0].sessionId;
    const early = await app.inject({ method: "POST", url: `/sessions/${sid}/join`, headers: h });
    expect(early.statusCode).toBe(409); // waiting room until teacher starts
    const start = await app.inject({ method: "POST", url: `/sessions/${sid}/start`, headers: { "x-user-id": T } });
    expect(start.json().demo).toBe(true);
    const join = await app.inject({ method: "POST", url: `/sessions/${sid}/join`, headers: h });
    expect(join.statusCode).toBe(200);
    const other = await app.inject({ method: "POST", url: `/sessions/${sid}/join`, headers: { "x-user-id": "intruder" } });
    expect(other.statusCode).toBe(403);
    const earnings = await app.inject({ method: "GET", url: `/teachers/${T}/earnings`, headers: h });
    expect(earnings.statusCode).toBe(403);
  });
});
