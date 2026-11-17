/**
 * Business rules for content access, the class/segment content subscription,
 * per-class teacher earnings and teacher-proposed routine changes.
 * Pure functions only, shared by the website, the API and the mobile app.
 */
import type { ClassLevel } from "./types";
import { perClassShares, splitGross } from "./money";

// ---------------------------------------------------------------------------
// Content segments: one subscription = one student × one segment
// ---------------------------------------------------------------------------

export const CONTENT_SEGMENTS = ["CLASS_6", "CLASS_7", "CLASS_8", "SSC", "HSC"] as const;
export type ContentSegment = (typeof CONTENT_SEGMENTS)[number];

export const SEGMENT_LABEL: Record<ContentSegment, { bn: string; en: string }> = {
  CLASS_6: { bn: "৬ষ্ঠ শ্রেণি", en: "Class 6" },
  CLASS_7: { bn: "৭ম শ্রেণি", en: "Class 7" },
  CLASS_8: { bn: "৮ম শ্রেণি", en: "Class 8" },
  SSC: { bn: "এসএসসি (৯ম-১০ম)", en: "SSC (Class 9-10)" },
  HSC: { bn: "এইচএসসি (একাদশ-দ্বাদশ)", en: "HSC (Class 11-12)" },
};

/** Default monthly price of a segment subscription, in taka. */
export const SEGMENT_PRICE = 999;

export const isSegment = (s: unknown): s is ContentSegment => CONTENT_SEGMENTS.includes(s as ContentSegment);

/**
 * Segments a class level covers. A Class 6-8 batch covers all three classes
 * (the batch level does not say which one); 9-10 and SSC are the SSC segment.
 */
export function segmentsOfLevel(level: string): ContentSegment[] {
  switch (level as ClassLevel) {
    case "CLASS_6_8": return ["CLASS_6", "CLASS_7", "CLASS_8"];
    case "CLASS_9_10": case "SSC": return ["SSC"];
    case "CLASS_11_12": case "HSC": return ["HSC"];
    default: return isSegment(level) ? [level] : [];
  }
}

/** The one segment a piece of content belongs to (explicit segment wins over its level). */
export function segmentOfContent(item: { level: string; segment?: string }): ContentSegment | null {
  if (item.segment && isSegment(item.segment)) return item.segment;
  const s = segmentsOfLevel(item.level);
  return s.length === 1 ? s[0]! : null;
}

export type AccessVia = "staff" | "teacher" | "subscription";

export interface AccessContext {
  /** Tutors (anyone with a tutor profile) and admins see everything. */
  staff: boolean;
  /** Segments with an active paid content subscription. */
  segments: ContentSegment[];
  /** What the student studies on the platform: one row per active batch. */
  batches: { subject: string; level: string; teacherName?: string | null }[];
}

export interface Access { open: boolean; via: AccessVia | null; teacherName?: string | null }

/**
 * Can this person open this lecture sheet / exam?
 * Studying a subject with any tutor here unlocks that subject's content for that class.
 * A segment subscription unlocks every subject of that segment.
 */
export function contentAccess(item: { subject: string; level: string; segment?: string }, ctx: AccessContext): Access {
  if (ctx.staff) return { open: true, via: "staff" };
  const seg = segmentOfContent(item);
  const b = ctx.batches.find((x) => x.subject === item.subject && seg !== null && segmentsOfLevel(x.level).includes(seg));
  if (b) return { open: true, via: "teacher", teacherName: b.teacherName ?? null };
  if (seg && ctx.segments.includes(seg)) return { open: true, via: "subscription" };
  return { open: false, via: null };
}

// ---------------------------------------------------------------------------
// Commission tiers: the more students a tutor teaches, the less we take
// ---------------------------------------------------------------------------

export interface Tier {
  code: "NEW" | "RISING" | "TRUSTED" | "STAR" | "EXPERT";
  /** Lifetime paying students needed (distinct students whose money reached the tutor). */
  minStudents: number;
  rate: number;
  /** Only for tutors the platform has marked as experts. */
  expertOnly?: boolean;
  label: { bn: string; en: string };
}

export const COMMISSION_TIERS: Tier[] = [
  { code: "NEW", minStudents: 0, rate: 0.2, label: { bn: "নতুন মাস্টারমশাই", en: "New tutor" } },
  { code: "RISING", minStudents: 10, rate: 0.15, label: { bn: "উঠতি মাস্টারমশাই", en: "Rising tutor" } },
  { code: "TRUSTED", minStudents: 25, rate: 0.12, label: { bn: "ভরসার মাস্টারমশাই", en: "Trusted tutor" } },
  { code: "STAR", minStudents: 50, rate: 0.1, label: { bn: "তারকা মাস্টারমশাই", en: "Star tutor" } },
  { code: "EXPERT", minStudents: 100, rate: 0.05, expertOnly: true, label: { bn: "এক্সপার্ট মাস্টারমশাই", en: "Expert tutor" } },
];

/** The tier a tutor is on now. The 5% tier also needs the expert badge. */
export function tierFor(students: number, expert = false, tiers: Tier[] = COMMISSION_TIERS): Tier {
  let best = tiers[0]!;
  for (const t of tiers) if (students >= t.minStudents && (!t.expertOnly || expert)) best = t;
  return best;
}

/** The next tier up and how many more students it takes (null at the top). */
export function nextTier(students: number, expert = false, tiers: Tier[] = COMMISSION_TIERS): { tier: Tier; need: number; needsExpert: boolean } | null {
  const now = tierFor(students, expert, tiers);
  const up = tiers.find((t) => t.rate < now.rate);
  if (!up) return null;
  return { tier: up, need: Math.max(0, up.minStudents - students), needsExpert: Boolean(up.expertOnly && !expert) };
}

// ---------------------------------------------------------------------------
// Per-class release of prepaid money
// ---------------------------------------------------------------------------

export interface Lot {
  /** What the plan costs (list price; coupons and bonus credit are the platform's cost). */
  gross: number;
  /** Classes this payment covers. */
  classes: number;
  /** Classes already released. */
  released: number;
}

export interface Release { classShare: number; teacher: number; commission: number; rate: number; lastOne: boolean }

/**
 * What the tutor earns for the next class held on this payment.
 * `rate` comes from the tutor's tier at the time of the class. Returns null when the lot is used up.
 */
export function nextRelease(lot: Lot, rate = COMMISSION_TIERS[0]!.rate): Release | null {
  if (lot.released >= lot.classes || lot.gross <= 0) return null;
  const share = perClassShares(lot.gross, lot.classes)[lot.released]!;
  const { teacher, platform } = splitGross(share, rate);
  return { classShare: share, teacher, commission: platform, rate, lastOne: lot.released + 1 === lot.classes };
}

/** Money of a lot not yet released (goes back to the student as credit when the lot expires). */
export function unreleased(lot: Lot): number {
  if (lot.released >= lot.classes) return 0;
  return perClassShares(lot.gross, lot.classes).slice(lot.released).reduce((a, b) => a + b, 0);
}

/** Withdrawals: whole taka, at least `min`, at most the whole balance (100%). */
export function withdrawable(balance: number, amount: number, min = 50): { ok: true } | { ok: false; why: "min" | "balance" | "bad" } {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, why: "bad" };
  if (amount < min) return { ok: false, why: "min" };
  if (amount > balance) return { ok: false, why: "balance" };
  return { ok: true };
}

/** Bangladesh mobile wallet number → 01XXXXXXXXX, or null. */
export function normalizeMsisdn(raw: string): string | null {
  const d = raw.replace(/[০-৯]/g, (c) => String("০১২৩৪৫৬৭৮৯".indexOf(c))).replace(/[^\d]/g, "");
  const local = d.startsWith("880") ? d.slice(2) : d.startsWith("88") && d.length === 13 ? d.slice(2) : d;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}

// ---------------------------------------------------------------------------
// Routine change / reschedule: the tutor proposes, every student approves
// ---------------------------------------------------------------------------

export type ChangeStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";

/** All listed students must approve; one "no" rejects it. A batch with no students applies at once. */
export function changeOutcome(required: string[], votes: { email: string; vote: "APPROVE" | "REJECT" }[]): "APPROVED" | "REJECTED" | "PENDING" {
  const mine = (e: string) => votes.find((v) => v.email.toLowerCase() === e.toLowerCase());
  if (required.some((e) => mine(e)?.vote === "REJECT")) return "REJECTED";
  if (required.every((e) => mine(e)?.vote === "APPROVE")) return "APPROVED";
  return "PENDING";
}

export interface WeeklySlotLite { day: number; time: string; minutes: number }

export function validSchedule(raw: unknown): WeeklySlotLite[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 14) return null;
  const out: WeeklySlotLite[] = [];
  for (const s of raw as Record<string, unknown>[]) {
    const day = Number(s?.day), minutes = Number(s?.minutes ?? 60), time = String(s?.time ?? "");
    if (!Number.isInteger(day) || day < 0 || day > 6) return null;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 300) return null;
    out.push({ day, time, minutes });
  }
  return out;
}
