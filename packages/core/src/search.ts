/** Teacher search and ranking shared by the API (fallback) and clients (demo mode). */
import { distanceKm } from "./geo";
import { hasTrialSeat, openSeats } from "./routine";
import type { BatchSize, ClassLevel, GeoPoint, Subject, TeacherSummary, TeachingMode, WeeklySlot } from "./types";

/** Part of the day a class starts in, Dhaka time. Online students search by this instead of area. */
export type TimeOfDay = "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";
export const TIMES_OF_DAY: TimeOfDay[] = ["MORNING", "AFTERNOON", "EVENING", "NIGHT"];

/** 05:00-11:59 morning, 12:00-16:59 afternoon, 17:00-19:59 evening, else night. */
export function timeOfDay(hhmm: string): TimeOfDay {
  const h = Number(hhmm.split(":")[0]);
  if (h >= 5 && h < 12) return "MORNING";
  if (h >= 12 && h < 17) return "AFTERNOON";
  if (h >= 17 && h < 20) return "EVENING";
  return "NIGHT";
}

/** "ONE" = 1:1 only, "GROUP" = batches of 2-5. */
export type BatchKind = "ONE" | "GROUP";

/** A teacher's slots in one mode (all modes if none given). */
export function slotsFor(t: TeacherSummary, mode?: TeachingMode): WeeklySlot[] {
  return t.routine.filter((s) => !mode || s.mode === mode);
}

/** Lowest monthly price in one mode; falls back to the teacher's overall price. */
export function fromPriceFor(t: TeacherSummary, mode?: TeachingMode): number {
  const prices = slotsFor(t, mode).map((s) => s.monthlyPrice);
  return prices.length ? Math.min(...prices) : t.fromPrice;
}

export interface TeacherQuery {
  subjects?: Subject[];
  level?: ClassLevel;
  mode?: TeachingMode;
  /** Student home location for offline search. */
  near?: GeoPoint;
  maxDistanceKm?: number;
  university?: string;
  maxPrice?: number;
  batchSize?: BatchSize;
  /** Online search: 1:1 or small group. */
  batchKind?: BatchKind;
  /** Online search: when in the day the class runs. */
  timeOfDay?: TimeOfDay;
  freeTrialOnly?: boolean;
  text?: string;
}

export interface TeacherHit {
  teacher: TeacherSummary;
  distanceKm?: number;
  /** Open slots that match every slot-level filter, cheapest first. */
  slots: WeeklySlot[];
  /** Cheapest matching slot price (what the card should show). */
  fromPrice: number;
  score: number;
}

export function searchTeachers(teachers: TeacherSummary[], q: TeacherQuery): TeacherHit[] {
  const hits: TeacherHit[] = [];
  for (const t of teachers) {
    if (q.subjects?.length && !q.subjects.every((s) => t.subjects.includes(s))) continue;
    if (q.level && !t.levels.includes(q.level)) continue;
    if (q.mode && !t.modes.includes(q.mode)) continue;
    if (q.university && !t.university.toLowerCase().includes(q.university.toLowerCase())) continue;
    // Slot-level filters: one real batch must satisfy all of them at once.
    const slots = slotsFor(t, q.mode)
      .filter((s) => openSeats(s) > 0)
      .filter((s) => !q.batchSize || s.batchSize === q.batchSize)
      .filter((s) => !q.batchKind || (q.batchKind === "ONE" ? s.batchSize === 1 : s.batchSize > 1))
      .filter((s) => !q.timeOfDay || timeOfDay(s.startTime) === q.timeOfDay)
      .filter((s) => !q.freeTrialOnly || hasTrialSeat(s))
      .filter((s) => q.maxPrice === undefined || s.monthlyPrice <= q.maxPrice)
      .sort((a, b) => a.monthlyPrice - b.monthlyPrice);
    if (!slots.length) continue;
    if (q.text) {
      const hay = `${t.name} ${t.university} ${t.department} ${t.subjects.join(" ")} ${t.area?.name ?? ""}`.toLowerCase();
      if (!hay.includes(q.text.toLowerCase())) continue;
    }

    // Distance only means something for home tuition. Online ignores where anyone lives.
    let dist: number | undefined;
    if (q.mode === "OFFLINE" && q.near) {
      if (!t.area) continue;
      dist = distanceKm(q.near, t.area.point);
      if (dist > t.area.radiusKm) continue; // further than the teacher will travel
      if (q.maxDistanceKm !== undefined && dist > q.maxDistanceKm) continue;
    }

    hits.push({ teacher: t, distanceKm: dist, slots, fromPrice: slots[0]!.monthlyPrice, score: rankScore(t, dist) });
  }
  return hits.sort((a, b) => b.score - a.score);
}

/** Simple, explainable rank: rating with review confidence, verified, content, closeness. */
export function rankScore(t: TeacherSummary, dist?: number): number {
  const confidence = Math.min(1, t.reviewCount / 20);
  let score = t.rating * confidence + 3.5 * (1 - confidence);
  if (t.verified) score += 0.5;
  score += Math.min(0.5, t.freeVideoCount * 0.05);
  if (dist !== undefined) score -= Math.min(1, dist / 10);
  return Math.round(score * 100) / 100;
}
