import { describe, expect, it } from "vitest";
import { DHAKA_AREAS } from "../src/geo";
import { DEMO_TEACHERS } from "../src/fixtures";
import { fromPriceFor, searchTeachers, timeOfDay } from "../src/search";

const ids = (h: { teacher: { id: string } }[]) => h.map((x) => x.teacher.id).sort();

describe("timeOfDay", () => {
  it("buckets Dhaka start times", () => {
    expect(timeOfDay("07:00")).toBe("MORNING");
    expect(timeOfDay("15:00")).toBe("AFTERNOON");
    expect(timeOfDay("17:30")).toBe("EVENING");
    expect(timeOfDay("21:00")).toBe("NIGHT");
    expect(timeOfDay("02:00")).toBe("NIGHT");
  });
});

describe("online search", () => {
  it("never filters or ranks by where anyone lives", () => {
    const far = searchTeachers(DEMO_TEACHERS, { mode: "ONLINE", near: DHAKA_AREAS.Uttara, maxDistanceKm: 1 });
    const none = searchTeachers(DEMO_TEACHERS, { mode: "ONLINE" });
    expect(ids(far)).toEqual(ids(none));
    expect(far.every((h) => h.distanceKm === undefined)).toBe(true);
    expect(ids(none)).not.toContain("t-sadia"); // home-only tutor
  });
  it("filters by time of day and batch kind on the same batch", () => {
    const morning = searchTeachers(DEMO_TEACHERS, { mode: "ONLINE", timeOfDay: "MORNING" });
    expect(morning.every((h) => h.slots.every((s) => s.startTime < "12:00"))).toBe(true);
    const oneToOne = searchTeachers(DEMO_TEACHERS, { mode: "ONLINE", batchKind: "ONE" });
    expect(oneToOne.every((h) => h.slots.every((s) => s.batchSize === 1 && s.mode === "ONLINE"))).toBe(true);
  });
  it("shows the online price, not the home-tuition price", () => {
    const rafi = searchTeachers(DEMO_TEACHERS, { mode: "ONLINE" }).find((h) => h.teacher.id === "t-rafi")!;
    expect(rafi.fromPrice).toBe(3000);
    expect(fromPriceFor(rafi.teacher, "OFFLINE")).toBe(8000);
  });
});

describe("home-tutor search", () => {
  it("only returns tutors with a home batch who travel to the student", () => {
    const hits = searchTeachers(DEMO_TEACHERS, { mode: "OFFLINE", near: DHAKA_AREAS.Uttara, maxDistanceKm: 5 });
    expect(ids(hits)).toEqual(["t-farhana"]);
    expect(hits[0]!.distanceKm).toBeLessThan(1);
    expect(hits[0]!.slots.every((s) => s.mode === "OFFLINE")).toBe(true);
  });
  it("drops online-only tutors", () => {
    const hits = searchTeachers(DEMO_TEACHERS, { mode: "OFFLINE", near: DHAKA_AREAS.Farmgate, maxDistanceKm: 15 });
    expect(ids(hits)).not.toContain("t-arif");
    expect(ids(hits)).not.toContain("t-mahin");
  });
});
