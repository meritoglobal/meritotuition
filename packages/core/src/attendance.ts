/**
 * Decide what happened in a class from the live classroom's join/leave log
 * (LiveKit webhooks) or the offline check-in. This is the evidence behind
 * automatic refunds, so the thresholds live here in one place.
 */

export const ATTENDANCE_RULES = {
  /** Minutes after start a party may join and still count as present. */
  graceMin: 15,
  /** Teacher joining later than this (minutes) counts as late. */
  lateAfterMin: 10,
  /** Class shorter than this share of the booked length counts as short. */
  minDurationRatio: 0.75,
} as const;

export interface PresenceInterval {
  join: Date;
  leave: Date;
}

export type SessionOutcome =
  | "COMPLETED"
  | "TEACHER_LATE_OR_SHORT"
  | "TEACHER_NO_SHOW"
  | "STUDENT_NO_SHOW"
  | "BOTH_ABSENT";

export interface AttendanceInput {
  scheduledStart: Date;
  durationMin: number;
  teacher: PresenceInterval[];
  /** Presence of each enrolled student; for a batch pass the student being settled. */
  student: PresenceInterval[];
}

export interface AttendanceResult {
  outcome: SessionOutcome;
  teacherFirstJoinMin: number | null;
  /** Minutes both teacher and student were in the room together. */
  overlapMin: number;
  reason: string;
}

const MIN = 60_000;

function firstJoinWithinGrace(intervals: PresenceInterval[], start: Date, graceMin: number): number | null {
  const joins = intervals
    .map((i) => (i.join.getTime() - start.getTime()) / MIN)
    .filter((m) => m <= graceMin)
    .sort((a, b) => a - b);
  const first = joins[0];
  return first === undefined ? null : Math.max(0, first);
}

/** Total minutes where at least one teacher interval overlaps one student interval. */
export function overlapMinutes(a: PresenceInterval[], b: PresenceInterval[]): number {
  let total = 0;
  for (const x of a) {
    for (const y of b) {
      const from = Math.max(x.join.getTime(), y.join.getTime());
      const to = Math.min(x.leave.getTime(), y.leave.getTime());
      if (to > from) total += to - from;
    }
  }
  return total / MIN;
}

export function evaluateAttendance(input: AttendanceInput): AttendanceResult {
  const { graceMin, lateAfterMin, minDurationRatio } = ATTENDANCE_RULES;
  const teacherJoin = firstJoinWithinGrace(input.teacher, input.scheduledStart, graceMin);
  const studentJoin = firstJoinWithinGrace(input.student, input.scheduledStart, graceMin);

  if (teacherJoin === null && studentJoin === null) {
    return { outcome: "BOTH_ABSENT", teacherFirstJoinMin: null, overlapMin: 0, reason: "Nobody joined within the grace period." };
  }
  if (teacherJoin === null) {
    return {
      outcome: "TEACHER_NO_SHOW",
      teacherFirstJoinMin: null,
      overlapMin: 0,
      reason: `Teacher did not join within ${graceMin} minutes of the start.`,
    };
  }
  if (studentJoin === null) {
    return {
      outcome: "STUDENT_NO_SHOW",
      teacherFirstJoinMin: teacherJoin,
      overlapMin: 0,
      reason: `Teacher waited; student did not join within ${graceMin} minutes.`,
    };
  }

  const overlap = overlapMinutes(input.teacher, input.student);
  const late = teacherJoin > lateAfterMin;
  const short = overlap < input.durationMin * minDurationRatio;
  if (late || short) {
    const why = [
      late ? `teacher joined ${Math.round(teacherJoin)} min late` : null,
      short ? `class ran ${Math.round(overlap)} of ${input.durationMin} min` : null,
    ]
      .filter(Boolean)
      .join(", ");
    return { outcome: "TEACHER_LATE_OR_SHORT", teacherFirstJoinMin: teacherJoin, overlapMin: overlap, reason: why };
  }
  return {
    outcome: "COMPLETED",
    teacherFirstJoinMin: teacherJoin,
    overlapMin: overlap,
    reason: `Class ran ${Math.round(overlap)} min.`,
  };
}
