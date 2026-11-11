/**
 * Turn one class's escrowed share into teacher pay, platform commission and
 * student refund. Every taka of the share lands in exactly one of the three.
 */
import type { SessionOutcome } from "./attendance";
import { assertTaka, splitGross } from "./money";

/** Share of the class price the teacher earns (before commission) per outcome. */
export const OUTCOME_TEACHER_SHARE: Record<SessionOutcome, number> = {
  COMPLETED: 1,
  TEACHER_LATE_OR_SHORT: 0.5,
  TEACHER_NO_SHOW: 0,
  STUDENT_NO_SHOW: 1,
  BOTH_ABSENT: 0,
};

/** Admin ruling on a flag: what share of the class price the teacher keeps. */
export type FlagRuling = 0 | 0.5 | 1;

export interface Settlement {
  classShare: number;
  teacherGross: number;
  teacherNet: number;
  platform: number;
  refund: number;
  /** Why, for the dashboards and the dispute log. */
  basis: string;
}

export function settleClass(params: {
  classShare: number;
  outcome: SessionOutcome;
  commissionRate: number;
  /** When a flag was upheld/partly upheld, admin's ruling overrides the outcome share. */
  flagRuling?: FlagRuling;
}): Settlement {
  const { classShare, outcome, commissionRate, flagRuling } = params;
  assertTaka(classShare);
  const fraction = flagRuling ?? OUTCOME_TEACHER_SHARE[outcome];
  const teacherGross = Math.round(classShare * fraction);
  const { teacher, platform } = splitGross(teacherGross, commissionRate);
  return {
    classShare,
    teacherGross,
    teacherNet: teacher,
    platform,
    refund: classShare - teacherGross,
    basis: flagRuling !== undefined ? `flag ruling ${fraction * 100}%` : `attendance: ${outcome}`,
  };
}

export type ClassStatus = "SCHEDULED" | "SETTLED" | "CANCELLED";

export interface PlanClass {
  share: number;
  status: ClassStatus;
  settlement?: Settlement;
}

export interface PlanCancellation {
  teacherNet: number;
  platform: number;
  refund: number;
  refundedClasses: number;
}

/**
 * Stop a plan early (either side). Settled classes keep their settlement; every
 * class not yet held is refunded in full.
 */
export function cancelPlan(classes: PlanClass[]): PlanCancellation {
  let teacherNet = 0;
  let platform = 0;
  let refund = 0;
  let refundedClasses = 0;
  for (const c of classes) {
    if (c.status === "SETTLED" && c.settlement) {
      teacherNet += c.settlement.teacherNet;
      platform += c.settlement.platform;
      refund += c.settlement.refund;
    } else {
      refund += c.share;
      refundedClasses += 1;
    }
  }
  return { teacherNet, platform, refund, refundedClasses };
}

/** Teacher strikes: 3 no-shows in 30 days hides the profile until review. */
export const STRIKE_RULES = { windowDays: 30, maxStrikes: 3 } as const;

export function shouldSuspend(noShowDates: Date[], now: Date): boolean {
  const cutoff = now.getTime() - STRIKE_RULES.windowDays * 86_400_000;
  return noShowDates.filter((d) => d.getTime() >= cutoff).length >= STRIKE_RULES.maxStrikes;
}

/** Flags must be raised within this many hours of the class; escrow releases after it. */
export const FLAG_WINDOW_HOURS = 48;

export function escrowReleaseAt(classEnd: Date): Date {
  return new Date(classEnd.getTime() + FLAG_WINDOW_HOURS * 3_600_000);
}
