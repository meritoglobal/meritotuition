/**
 * Business rules for content access, the class/segment content subscription,
 * per-class teacher earnings and teacher-proposed routine changes.
 * Pure functions only, shared by the website, the API and the mobile app.
 */
import type { ClassLevel } from "./types";
import { perClassShares, splitGross } from "./money";

// ---------------------------------------------------------------------------
// Content segments: one ৳999 pack = one student × one class (× one group from Class 9)
// ---------------------------------------------------------------------------

/** The class a piece of content belongs to. */
export const CLASS_SEGMENTS = ["CLASS_6", "CLASS_7", "CLASS_8", "SSC", "HSC"] as const;
export type ClassSegment = (typeof CLASS_SEGMENTS)[number];

export const GROUPS = ["SCIENCE", "BUSINESS", "HUMANITIES"] as const;
export type Group = (typeof GROUPS)[number];

/** What a student buys: Class 6, 7, 8 as they are; SSC and HSC split by group (বিভাগ). */
export const CONTENT_SEGMENTS = [
  "CLASS_6", "CLASS_7", "CLASS_8",
  "SSC_SCIENCE", "SSC_BUSINESS", "SSC_HUMANITIES",
  "HSC_SCIENCE", "HSC_BUSINESS", "HSC_HUMANITIES",
] as const;
export type ContentSegment = (typeof CONTENT_SEGMENTS)[number];

const GROUP_LABEL: Record<Group, { bn: string; en: string }> = {
  SCIENCE: { bn: "বিজ্ঞান", en: "Science" }, BUSINESS: { bn: "ব্যবসায় শিক্ষা", en: "Business Studies" }, HUMANITIES: { bn: "মানবিক", en: "Humanities" },
};
const CLASS_LABEL: Record<ClassSegment, { bn: string; en: string }> = {
  CLASS_6: { bn: "৬ষ্ঠ শ্রেণি", en: "Class 6" }, CLASS_7: { bn: "৭ম শ্রেণি", en: "Class 7" }, CLASS_8: { bn: "৮ম শ্রেণি", en: "Class 8" },
  SSC: { bn: "এসএসসি (৯ম-১০ম)", en: "SSC (Class 9-10)" }, HSC: { bn: "এইচএসসি (একাদশ-দ্বাদশ)", en: "HSC (Class 11-12)" },
};

export const packClass = (p: ContentSegment): ClassSegment => p.split("_").slice(0, p.startsWith("CLASS") ? 2 : 1).join("_") as ClassSegment;
export const packGroup = (p: ContentSegment): Group | null => (p.startsWith("CLASS") ? null : (p.split("_")[1] as Group));

export const SEGMENT_LABEL = Object.fromEntries(CONTENT_SEGMENTS.map((p) => {
  const c = CLASS_LABEL[packClass(p)], g = packGroup(p);
  return [p, g ? { bn: `${c.bn} · ${GROUP_LABEL[g].bn}`, en: `${c.en} · ${GROUP_LABEL[g].en}` } : c];
})) as Record<ContentSegment, { bn: string; en: string }>;
export { CLASS_LABEL as CLASS_SEGMENT_LABEL, GROUP_LABEL };

/** Group-only subjects; everything else (Bangla, English, Math, ICT, religion...) is common to all groups. */
export const SUBJECT_GROUP: Record<string, Group> = {
  Physics: "SCIENCE", Chemistry: "SCIENCE", Biology: "SCIENCE", "Higher Math": "SCIENCE",
  Accounting: "BUSINESS", Finance: "BUSINESS", "Business Entrepreneurship": "BUSINESS",
  Economics: "HUMANITIES", History: "HUMANITIES", Geography: "HUMANITIES", Civics: "HUMANITIES",
};

/** Default monthly price of a pack, in taka. */
export const SEGMENT_PRICE = 999;

export const isSegment = (s: unknown): s is ContentSegment => CONTENT_SEGMENTS.includes(s as ContentSegment);

/**
 * Classes a class level covers. A Class 6-8 batch covers all three classes
 * (the batch level does not say which one); 9-10 and SSC are SSC.
 */
export function segmentsOfLevel(level: string): ClassSegment[] {
  switch (level as ClassLevel) {
    case "CLASS_6_8": return ["CLASS_6", "CLASS_7", "CLASS_8"];
    case "CLASS_9_10": case "SSC": return ["SSC"];
    case "CLASS_11_12": case "HSC": return ["HSC"];
    default: return (CLASS_SEGMENTS as readonly string[]).includes(level) ? [level as ClassSegment] : [];
  }
}

/** The one class a piece of content belongs to (explicit segment wins over its level). */
export function segmentOfContent(item: { level: string; segment?: string }): ClassSegment | null {
  if (item.segment && (CLASS_SEGMENTS as readonly string[]).includes(item.segment)) return item.segment as ClassSegment;
  const s = segmentsOfLevel(item.level);
  return s.length === 1 ? s[0]! : null;
}

/** Does this pack open this item? Same class, and a group subject only for its own group. */
export function packOpens(pack: ContentSegment, item: { subject: string; level: string; segment?: string }): boolean {
  if (segmentOfContent(item) !== packClass(pack)) return false;
  const g = packGroup(pack), sg = SUBJECT_GROUP[item.subject];
  return !g || !sg || g === sg;
}

/** Packs a student may see for a class (the group ones from Class 9). */
export const packsOfClass = (c: ClassSegment): ContentSegment[] => CONTENT_SEGMENTS.filter((p) => packClass(p) === c);

export type AccessVia = "staff" | "teacher" | "subscription";

export interface AccessContext {
  /** Verified tutors and admins see everything. */
  staff: boolean;
  /** Packs with an active paid content subscription. */
  segments: ContentSegment[];
  /** What the student studies on the platform with a verified tutor: one row per active batch. */
  batches: { subject: string; level: string; teacherName?: string | null }[];
}

export interface Access { open: boolean; via: AccessVia | null; teacherName?: string | null }

/**
 * Can this person open this lecture sheet / exam?
 * Studying a subject with any tutor here unlocks that subject's content for that class.
 * A pack unlocks its class's common subjects plus its own group's subjects.
 */
export function contentAccess(item: { subject: string; level: string; segment?: string }, ctx: AccessContext): Access {
  if (ctx.staff) return { open: true, via: "staff" };
  const seg = segmentOfContent(item);
  const b = ctx.batches.find((x) => x.subject === item.subject && seg !== null && segmentsOfLevel(x.level).includes(seg));
  if (b) return { open: true, via: "teacher", teacherName: b.teacherName ?? null };
  if (ctx.segments.some((p) => packOpens(p, item))) return { open: true, via: "subscription" };
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

// ---------------------------------------------------------------------------
// Late tutor: refund only when the student complains
// ---------------------------------------------------------------------------

/**
 * Owner's rule: if the tutor comes late (15 minutes, half an hour...) and the student
 * complains about that class, half of that class's payment goes back to the student.
 * No complaint, no refund. A tutor who never opens the class is refunded on its own.
 */
export const LATE_COMPLAINT = { afterMin: 15, refundShare: 0.5, windowHours: 48 } as const;

export type ComplaintReason = "TEACHER_LATE" | "ENDED_EARLY" | "POOR_TEACHING" | "BEHAVIOUR" | "OTHER";
export const COMPLAINT_REASONS: ComplaintReason[] = ["TEACHER_LATE", "ENDED_EARLY", "POOR_TEACHING", "BEHAVIOUR", "OTHER"];

/** What happens to a complaint at once: a late class backed by the room log refunds half; the rest goes to an admin. */
export function complaintRuling(reason: ComplaintReason, lateMin: number | null): "HALF_REFUND" | "REVIEW" {
  return reason === "TEACHER_LATE" && lateMin !== null && lateMin >= LATE_COMPLAINT.afterMin ? "HALF_REFUND" : "REVIEW";
}

/** Half of one class share, split so the tutor and the platform each give back their half. */
export function halfBack(gross: number, commission: number): { refund: number; fromTutor: number; fromPlatform: number } {
  const refund = Math.round(gross * LATE_COMPLAINT.refundShare);
  const fromPlatform = Math.round(commission * LATE_COMPLAINT.refundShare);
  return { refund, fromTutor: refund - fromPlatform, fromPlatform };
}

export function complaintOpen(classAt: Date, now = new Date()): boolean {
  return now.getTime() - classAt.getTime() <= LATE_COMPLAINT.windowHours * 3_600_000;
}

/**
 * Minutes the tutor was late: when they opened the room vs the class time that day
 * (weekly routine in Dhaka time, or a rescheduled time). Opening early counts as 0.
 * null when no class was scheduled near that time.
 */
export function lateMinutes(openedAt: Date, schedule: WeeklySlotLite[], moved: Date[] = []): number | null {
  const DHAKA = 6 * 60 * 60_000;
  const local = new Date(openedAt.getTime() + DHAKA);
  const starts: number[] = moved.map((d) => d.getTime());
  for (let add = -1; add <= 0; add++) {
    for (const s of schedule) {
      const [h, m] = s.time.split(":").map(Number);
      const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + add, h, m));
      if (d.getUTCDay() === s.day) starts.push(d.getTime() - DHAKA);
    }
  }
  // The class this opening belongs to: the latest start no more than 30 min after opening,
  // and not more than 3 hours before it.
  const t = openedAt.getTime();
  const near = starts.filter((x) => x <= t + 30 * 60_000 && t - x <= 3 * 3_600_000).sort((a, b) => b - a)[0];
  if (near === undefined) return null;
  return Math.max(0, Math.round((t - near) / 60_000));
}
