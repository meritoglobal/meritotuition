import { describe, expect, it } from "vitest";
import { DEMO_TEACHERS, DHAKA_AREAS, classesPerMonth, dhakaTime, roomState, searchTeachers, timeLabel, upcomingOccurrences } from "../src";

describe("routine", () => {
  it("lists Sun/Tue/Thu 5 PM Dhaka classes", () => {
    const from = new Date("2026-11-14T00:00:00Z"); // Saturday
    const occ = upcomingOccurrences({ days: [0, 2, 4], startTime: "17:00" }, from, 3);
    expect(occ.map((d) => d.toISOString())).toEqual([
      "2026-11-15T11:00:00.000Z",
      "2026-11-17T11:00:00.000Z",
      "2026-11-19T11:00:00.000Z",
    ]);
    expect(occ.map(dhakaTime)).toEqual(["17:00", "17:00", "17:00"]);
  });
  it("3 days a week = 12 classes a month", () => {
    expect(classesPerMonth({ days: [0, 2, 4] })).toBe(12);
  });
  it("time labels", () => {
    expect(timeLabel("17:30")).toBe("5:30 PM");
    expect(timeLabel("00:15")).toBe("12:15 AM");
  });
  it("waiting room states", () => {
    const start = new Date("2026-11-15T11:00:00Z");
    const t = (min: number) => new Date(start.getTime() + min * 60_000);
    const base = { start, durationMin: 60, teacherStarted: false, ended: false };
    expect(roomState({ ...base, now: t(-30) })).toBe("UPCOMING");
    expect(roomState({ ...base, now: t(-5) })).toBe("OPENS_SOON");
    expect(roomState({ ...base, now: t(2) })).toBe("WAITING_FOR_TEACHER");
    expect(roomState({ ...base, now: t(2), teacherStarted: true })).toBe("LIVE");
  });
});

describe("search", () => {
  it("finds offline Physics tutors near Farmgate", () => {
    const hits = searchTeachers(DEMO_TEACHERS, { mode: "OFFLINE", near: DHAKA_AREAS.Farmgate, subjects: ["Physics"] });
    expect(hits.map((h) => h.teacher.id)).toContain("t-rafi");
    expect(hits.every((h) => (h.distanceKm ?? 99) <= h.teacher.area!.radiusKm)).toBe(true);
  });
  it("filters by university", () => {
    const hits = searchTeachers(DEMO_TEACHERS, { university: "buet" });
    expect(hits.every((h) => h.teacher.university === "BUET")).toBe(true);
  });
  it("Math + Physics + Chemistry together", () => {
    const hits = searchTeachers(DEMO_TEACHERS, { subjects: ["Math", "Physics", "Chemistry"] });
    expect(hits.map((h) => h.teacher.id)).toEqual(["t-sadia"]);
  });
});
