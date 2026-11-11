/** Weekly routine helpers: upcoming class times, open seats, and trial seats. */
import type { WeeklySlot, Weekday } from "./types";

/** Dhaka is UTC+6 all year (no daylight saving). */
export const DHAKA_OFFSET_MIN = 6 * 60;

export function openSeats(slot: Pick<WeeklySlot, "batchSize" | "seatsTaken">): number {
  return Math.max(0, slot.batchSize - slot.seatsTaken);
}

export function hasTrialSeat(slot: WeeklySlot): boolean {
  return slot.trialSeats > 0 && openSeats(slot) > 0;
}

/** Classes per month for a slot, using 4 weeks (e.g. 3 days a week = 12 classes). */
export function classesPerMonth(slot: Pick<WeeklySlot, "days">): number {
  return slot.days.length * 4;
}

/**
 * Next `count` class start times (UTC Date) for a slot, from `from` onward.
 * Times in the routine are Dhaka local.
 */
export function upcomingOccurrences(slot: Pick<WeeklySlot, "days" | "startTime">, from: Date, count: number): Date[] {
  const [hh, mm] = slot.startTime.split(":").map(Number);
  if (hh === undefined || mm === undefined || Number.isNaN(hh) || Number.isNaN(mm)) {
    throw new Error(`Bad startTime ${slot.startTime}`);
  }
  const out: Date[] = [];
  // Work in "Dhaka wall clock" by shifting the instant.
  const shift = DHAKA_OFFSET_MIN * 60_000;
  const local = new Date(from.getTime() + shift);
  const day0 = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  for (let d = 0; out.length < count && d < 7 * (count + 1); d++) {
    const dayStart = day0 + d * 86_400_000;
    const weekday = new Date(dayStart).getUTCDay() as Weekday;
    if (!slot.days.includes(weekday)) continue;
    const startUtc = new Date(dayStart + (hh * 60 + mm) * 60_000 - shift);
    if (startUtc.getTime() >= from.getTime()) out.push(startUtc);
  }
  return out;
}

/** Format a UTC instant as Dhaka local "HH:mm". */
export function dhakaTime(d: Date): string {
  const local = new Date(d.getTime() + DHAKA_OFFSET_MIN * 60_000);
  return `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
}

/** 12-hour label for a routine time, e.g. "17:30" -> "5:30 PM". */
export function timeLabel(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Live-class panel state for the waiting room countdown. */
export type ClassRoomState = "UPCOMING" | "OPENS_SOON" | "WAITING_FOR_TEACHER" | "LIVE" | "ENDED";

export const ROOM_OPENS_MIN_BEFORE = 10;

export function roomState(params: {
  now: Date;
  start: Date;
  durationMin: number;
  teacherStarted: boolean;
  ended: boolean;
}): ClassRoomState {
  const { now, start, durationMin, teacherStarted, ended } = params;
  if (ended) return "ENDED";
  const diffMin = (start.getTime() - now.getTime()) / 60_000;
  if (teacherStarted) return "LIVE";
  if (diffMin > ROOM_OPENS_MIN_BEFORE) return "UPCOMING";
  if (diffMin > 0) return "OPENS_SOON";
  if (-diffMin > durationMin) return "ENDED";
  return "WAITING_FOR_TEACHER";
}
