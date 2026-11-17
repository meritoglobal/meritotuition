import { describe, expect, it } from "vitest";
import {
  complaintOpen, complaintRuling, halfBack, lateMinutes,
  COMMISSION_TIERS, SEGMENT_LABEL, packClass, packGroup, changeOutcome, contentAccess, nextRelease, nextTier, normalizeMsisdn, tierFor, segmentOfContent, segmentsOfLevel,
  unreleased, validSchedule, withdrawable,
} from "../src";

describe("segments", () => {
  it("maps levels to segments", () => {
    expect(segmentsOfLevel("CLASS_9_10")).toEqual(["SSC"]);
    expect(segmentsOfLevel("CLASS_6_8")).toEqual(["CLASS_6", "CLASS_7", "CLASS_8"]);
    expect(segmentsOfLevel("HSC")).toEqual(["HSC"]);
    expect(segmentsOfLevel("O_LEVEL")).toEqual([]);
    expect(segmentOfContent({ level: "CLASS_6_8", segment: "CLASS_7" })).toBe("CLASS_7");
    expect(segmentOfContent({ level: "CLASS_6_8" })).toBeNull();
  });
});

describe("content access", () => {
  const sheet = { subject: "Physics", level: "CLASS_9_10" };
  const none = { staff: false, segments: [], batches: [] };
  it("is locked with nothing", () => expect(contentAccess(sheet, none).open).toBe(false));
  it("opens for a student of any tutor in that subject and class", () => {
    const a = contentAccess(sheet, { ...none, batches: [{ subject: "Physics", level: "SSC", teacherName: "Rafi" }] });
    expect(a).toEqual({ open: true, via: "teacher", teacherName: "Rafi" });
  });
  it("does not open other subjects through a tutor", () => {
    expect(contentAccess(sheet, { ...none, batches: [{ subject: "Chemistry", level: "SSC" }] }).open).toBe(false);
    expect(contentAccess(sheet, { ...none, batches: [{ subject: "Physics", level: "HSC" }] }).open).toBe(false);
  });
  it("opens every subject of a subscribed segment", () => {
    expect(contentAccess(sheet, { ...none, segments: ["SSC_SCIENCE"] }).via).toBe("subscription");
    expect(contentAccess(sheet, { ...none, segments: ["CLASS_8"] }).open).toBe(false);
  });
  it("keeps groups apart: a science pack opens nothing of business", () => {
    const acc = { subject: "Accounting", level: "CLASS_9_10" }, eng = { subject: "English", level: "CLASS_9_10" };
    expect(contentAccess(sheet, { ...none, segments: ["SSC_BUSINESS"] }).open).toBe(false);
    expect(contentAccess(acc, { ...none, segments: ["SSC_SCIENCE"] }).open).toBe(false);
    expect(contentAccess(acc, { ...none, segments: ["SSC_BUSINESS"] }).open).toBe(true);
    expect(contentAccess(eng, { ...none, segments: ["SSC_HUMANITIES"] }).open).toBe(true); // common subject
    expect(contentAccess(sheet, { ...none, segments: ["HSC_SCIENCE"] }).open).toBe(false); // other class
  });
  it("names packs", () => {
    expect(packClass("SSC_SCIENCE")).toBe("SSC");
    expect(packClass("CLASS_7")).toBe("CLASS_7");
    expect(packGroup("CLASS_7")).toBeNull();
    expect(SEGMENT_LABEL.HSC_BUSINESS.en).toBe("HSC (Class 11-12) · Business Studies");
  });
  it("opens everything for tutors", () => expect(contentAccess(sheet, { ...none, staff: true }).via).toBe("staff"));
});

describe("commission tiers", () => {
  it("starts new tutors at 20%", () => {
    expect(tierFor(0).rate).toBe(0.2);
    expect(nextRelease({ gross: 3000, classes: 12, released: 0 })).toEqual({ classShare: 250, teacher: 200, commission: 50, rate: 0.2, lastOne: false });
  });
  it("drops as students grow", () => {
    expect(tierFor(10).rate).toBe(0.15);
    expect(tierFor(30).rate).toBe(0.12);
    expect(tierFor(60).rate).toBe(0.1);
    expect(nextRelease({ gross: 1000, classes: 4, released: 0 }, tierFor(60).rate)!.commission).toBe(25);
  });
  it("keeps 5% for experts only", () => {
    expect(tierFor(500).rate).toBe(0.1);
    expect(tierFor(500, true).rate).toBe(0.05);
    expect(tierFor(20, true).rate).toBe(0.15);
    expect(nextTier(60)).toEqual({ tier: COMMISSION_TIERS[4], need: 40, needsExpert: true });
    expect(nextTier(3)!.need).toBe(7);
    expect(nextTier(100, true)).toBeNull();
  });
});

describe("per-class release", () => {
  it("releases every taka exactly once", () => {
    const lot = { gross: 1000, classes: 3, released: 0 };
    let total = 0;
    for (; lot.released < 3; lot.released++) { const r = nextRelease(lot)!; total += r.teacher + r.commission; }
    expect(total).toBe(1000);
    expect(nextRelease(lot)).toBeNull();
  });
  it("knows what is left", () => {
    expect(unreleased({ gross: 1000, classes: 3, released: 1 })).toBe(666);
    expect(unreleased({ gross: 1000, classes: 3, released: 3 })).toBe(0);
  });
});

describe("withdrawals", () => {
  it("allows up to 100% of the balance", () => {
    expect(withdrawable(1200, 1200)).toEqual({ ok: true });
    expect(withdrawable(1200, 1201)).toEqual({ ok: false, why: "balance" });
    expect(withdrawable(1200, 10)).toEqual({ ok: false, why: "min" });
    expect(withdrawable(1200, 10.5).ok).toBe(false);
  });
  it("normalises bKash numbers", () => {
    expect(normalizeMsisdn("+880 1712-345678")).toBe("01712345678");
    expect(normalizeMsisdn("০১৮১২৩৪৫৬৭৮")).toBe("01812345678");
    expect(normalizeMsisdn("01212345678")).toBeNull();
  });
});

describe("routine changes", () => {
  const req = ["a@x.com", "b@x.com"];
  it("needs every student", () => {
    expect(changeOutcome(req, [{ email: "a@x.com", vote: "APPROVE" }])).toBe("PENDING");
    expect(changeOutcome(req, [{ email: "a@x.com", vote: "APPROVE" }, { email: "B@x.com", vote: "APPROVE" }])).toBe("APPROVED");
    expect(changeOutcome(req, [{ email: "b@x.com", vote: "REJECT" }])).toBe("REJECTED");
    expect(changeOutcome([], [])).toBe("APPROVED");
  });
  it("checks a schedule", () => {
    expect(validSchedule([{ day: 0, time: "17:00", minutes: 60 }])).toEqual([{ day: 0, time: "17:00", minutes: 60 }]);
    expect(validSchedule([{ day: 7, time: "17:00" }])).toBeNull();
    expect(validSchedule([])).toBeNull();
  });
});

describe("late tutor complaints", () => {
  // Sunday 2026-11-15 17:00 Dhaka = 11:00 UTC
  const sched = [{ day: 0, time: "17:00", minutes: 60 }];
  it("minutes late from the routine", () => {
    expect(lateMinutes(new Date("2026-11-15T11:20:00Z"), sched)).toBe(20);
    expect(lateMinutes(new Date("2026-11-15T10:50:00Z"), sched)).toBe(0);
    expect(lateMinutes(new Date("2026-11-15T11:40:00Z"), sched)).toBe(40);
    expect(lateMinutes(new Date("2026-11-16T11:20:00Z"), sched)).toBeNull();
  });
  it("uses a rescheduled time", () => {
    expect(lateMinutes(new Date("2026-11-16T12:16:00Z"), sched, [new Date("2026-11-16T12:00:00Z")])).toBe(16);
  });
  it("only a complaint about a late class refunds half", () => {
    expect(complaintRuling("TEACHER_LATE", 20)).toBe("HALF_REFUND");
    expect(complaintRuling("TEACHER_LATE", 15)).toBe("HALF_REFUND");
    expect(complaintRuling("TEACHER_LATE", 5)).toBe("REVIEW");
    expect(complaintRuling("TEACHER_LATE", null)).toBe("REVIEW");
    expect(complaintRuling("POOR_TEACHING", 40)).toBe("REVIEW");
  });
  it("half back splits between tutor and platform", () => {
    expect(halfBack(500, 100)).toEqual({ refund: 250, fromTutor: 200, fromPlatform: 50 });
    const h = halfBack(333, 67);
    expect(h.fromTutor + h.fromPlatform).toBe(h.refund);
  });
  it("48 hour window", () => {
    const at = new Date("2026-11-15T11:00:00Z");
    expect(complaintOpen(at, new Date("2026-11-17T10:00:00Z"))).toBe(true);
    expect(complaintOpen(at, new Date("2026-11-17T12:00:00Z"))).toBe(false);
  });
});
