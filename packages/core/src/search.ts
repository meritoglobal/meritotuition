/** Teacher search and ranking shared by the API (fallback) and clients (demo mode). */
import { distanceKm } from "./geo";
import { hasTrialSeat, openSeats } from "./routine";
import type { BatchSize, ClassLevel, GeoPoint, Subject, TeacherSummary, TeachingMode } from "./types";

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
  freeTrialOnly?: boolean;
  text?: string;
}

export interface TeacherHit {
  teacher: TeacherSummary;
  distanceKm?: number;
  score: number;
}

export function searchTeachers(teachers: TeacherSummary[], q: TeacherQuery): TeacherHit[] {
  const hits: TeacherHit[] = [];
  for (const t of teachers) {
    if (q.subjects?.length && !q.subjects.every((s) => t.subjects.includes(s))) continue;
    if (q.level && !t.levels.includes(q.level)) continue;
    if (q.mode && !t.modes.includes(q.mode)) continue;
    if (q.university && !t.university.toLowerCase().includes(q.university.toLowerCase())) continue;
    if (q.maxPrice !== undefined && t.fromPrice > q.maxPrice) continue;
    const slots = t.routine.filter((s) => (!q.mode || s.mode === q.mode) && openSeats(s) > 0);
    if (q.batchSize && !slots.some((s) => s.batchSize === q.batchSize)) continue;
    if (q.freeTrialOnly && !slots.some(hasTrialSeat)) continue;
    if (q.text) {
      const hay = `${t.name} ${t.university} ${t.department} ${t.subjects.join(" ")} ${t.area?.name ?? ""}`.toLowerCase();
      if (!hay.includes(q.text.toLowerCase())) continue;
    }

    let dist: number | undefined;
    if (q.near && t.area) {
      dist = distanceKm(q.near, t.area.point);
      // Offline: the teacher must be willing to travel that far, and within the student's limit.
      if (q.mode === "OFFLINE" && dist > t.area.radiusKm) continue;
      if (q.maxDistanceKm !== undefined && q.mode === "OFFLINE" && dist > q.maxDistanceKm) continue;
    } else if (q.mode === "OFFLINE" && q.near) {
      continue;
    }

    hits.push({ teacher: t, distanceKm: dist, score: rankScore(t, dist) });
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
