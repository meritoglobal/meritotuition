import { describe, expect, it } from "vitest";
import {
  cancelPlan,
  commissionRate,
  escrowReleaseAt,
  evaluateAttendance,
  perClassShares,
  settleClass,
  shouldSuspend,
  splitGross,
  type PlanClass,
} from "../src";

const start = new Date("2026-11-15T11:00:00Z"); // 5:00 PM Dhaka
const at = (min: number) => new Date(start.getTime() + min * 60_000);

describe("commission", () => {
  it("follows the 25/20/15 ladder", () => {
    expect(commissionRate(0)).toBe(0.25);
    expect(commissionRate(49)).toBe(0.25);
    expect(commissionRate(50)).toBe(0.2);
    expect(commissionRate(199)).toBe(0.2);
    expect(commissionRate(200)).toBe(0.15);
  });
  it("splits so every taka is accounted for", () => {
    expect(splitGross(500, 0.2)).toEqual({ teacher: 400, platform: 100 });
    expect(splitGross(333, 0.25)).toEqual({ teacher: 250, platform: 83 });
  });
  it("rejects fractional taka", () => {
    expect(() => splitGross(10.5, 0.2)).toThrow();
  });
});

describe("perClassShares", () => {
  it("divides evenly", () => {
    expect(perClassShares(6000, 12)).toEqual(Array(12).fill(500));
  });
  it("spreads remainders and sums to total", () => {
    const s = perClassShares(1000, 3);
    expect(s).toEqual([334, 333, 333]);
    expect(s.reduce((a, b) => a + b, 0)).toBe(1000);
  });
});

describe("attendance", () => {
  it("completed class", () => {
    const r = evaluateAttendance({
      scheduledStart: start,
      durationMin: 60,
      teacher: [{ join: at(-2), leave: at(61) }],
      student: [{ join: at(1), leave: at(60) }],
    });
    expect(r.outcome).toBe("COMPLETED");
  });
  it("teacher no-show", () => {
    const r = evaluateAttendance({
      scheduledStart: start,
      durationMin: 60,
      teacher: [{ join: at(20), leave: at(60) }],
      student: [{ join: at(0), leave: at(20) }],
    });
    expect(r.outcome).toBe("TEACHER_NO_SHOW");
  });
  it("teacher late", () => {
    const r = evaluateAttendance({
      scheduledStart: start,
      durationMin: 60,
      teacher: [{ join: at(12), leave: at(72) }],
      student: [{ join: at(0), leave: at(72) }],
    });
    expect(r.outcome).toBe("TEACHER_LATE_OR_SHORT");
  });
  it("short class (left after 30 of 60 min)", () => {
    const r = evaluateAttendance({
      scheduledStart: start,
      durationMin: 60,
      teacher: [{ join: at(0), leave: at(30) }],
      student: [{ join: at(0), leave: at(60) }],
    });
    expect(r.outcome).toBe("TEACHER_LATE_OR_SHORT");
    expect(r.overlapMin).toBe(30);
  });
  it("reconnects are summed", () => {
    const r = evaluateAttendance({
      scheduledStart: start,
      durationMin: 60,
      teacher: [{ join: at(0), leave: at(25) }, { join: at(27), leave: at(60) }],
      student: [{ join: at(0), leave: at(60) }],
    });
    expect(r.outcome).toBe("COMPLETED");
    expect(r.overlapMin).toBe(58);
  });
  it("student no-show pays the teacher", () => {
    const r = evaluateAttendance({
      scheduledStart: start,
      durationMin: 60,
      teacher: [{ join: at(0), leave: at(20) }],
      student: [],
    });
    expect(r.outcome).toBe("STUDENT_NO_SHOW");
  });
});

describe("settlement", () => {
  it("completed class: teacher net + commission", () => {
    const s = settleClass({ classShare: 500, outcome: "COMPLETED", commissionRate: 0.2 });
    expect(s).toMatchObject({ teacherNet: 400, platform: 100, refund: 0 });
  });
  it("teacher no-show: full refund", () => {
    const s = settleClass({ classShare: 500, outcome: "TEACHER_NO_SHOW", commissionRate: 0.2 });
    expect(s).toMatchObject({ teacherNet: 0, platform: 0, refund: 500 });
  });
  it("late: half to teacher, half back", () => {
    const s = settleClass({ classShare: 500, outcome: "TEACHER_LATE_OR_SHORT", commissionRate: 0.2 });
    expect(s).toMatchObject({ teacherGross: 250, teacherNet: 200, platform: 50, refund: 250 });
  });
  it("admin ruling overrides attendance", () => {
    const s = settleClass({ classShare: 500, outcome: "COMPLETED", commissionRate: 0.2, flagRuling: 0 });
    expect(s).toMatchObject({ teacherNet: 0, platform: 0, refund: 500 });
  });
  it("every taka lands somewhere", () => {
    for (const share of [1, 333, 499, 500, 1250]) {
      for (const outcome of ["COMPLETED", "TEACHER_LATE_OR_SHORT", "TEACHER_NO_SHOW"] as const) {
        const s = settleClass({ classShare: share, outcome, commissionRate: 0.25 });
        expect(s.teacherNet + s.platform + s.refund).toBe(share);
      }
    }
  });
});

describe("cancel plan (doc example)", () => {
  it("teacher taught 2 of 12, student gets 5000 back", () => {
    const shares = perClassShares(6000, 12);
    const classes: PlanClass[] = shares.map((share, i) =>
      i < 2
        ? { share, status: "SETTLED", settlement: settleClass({ classShare: share, outcome: "COMPLETED", commissionRate: 0.2 }) }
        : { share, status: "SCHEDULED" },
    );
    expect(cancelPlan(classes)).toEqual({ teacherNet: 800, platform: 200, refund: 5000, refundedClasses: 10 });
  });
});

describe("strikes and escrow window", () => {
  it("3 no-shows in 30 days suspends", () => {
    const now = new Date("2026-11-30T00:00:00Z");
    const d = (day: number) => new Date(`2026-11-${String(day).padStart(2, "0")}T00:00:00Z`);
    expect(shouldSuspend([d(5), d(10), d(20)], now)).toBe(true);
    expect(shouldSuspend([d(10), d(20)], now)).toBe(false);
  });
  it("releases 48h after class end", () => {
    expect(escrowReleaseAt(at(60)).toISOString()).toBe("2026-11-17T12:00:00.000Z");
  });
});
