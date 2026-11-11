/** Demo plan/earnings built with the real rules from @mastermoshai/core, until the API is wired in. */
import { DEMO_TEACHERS, commissionRate, perClassShares, settleClass, upcomingOccurrences, type SessionOutcome } from "@mastermoshai/core";

const rafi = DEMO_TEACHERS[0]!;
const slot = rafi.routine[0]!;

export function demoStudentPlan(now = new Date()) {
  const first = new Date(now.getTime() - 9 * 86_400_000);
  const starts = upcomingOccurrences(slot, first, 12);
  const shares = perClassShares(slot.monthlyPrice, 12);
  const outcomes: (SessionOutcome | undefined)[] = ["COMPLETED", "COMPLETED", "TEACHER_NO_SHOW", "COMPLETED"];
  return {
    teacher: rafi,
    slot,
    paid: slot.monthlyPrice,
    classes: starts.map((start, i) => {
      const outcome = start < now ? (outcomes[i] ?? "COMPLETED") : undefined;
      const st = outcome ? settleClass({ classShare: shares[i]!, outcome, commissionRate: 0.25 }) : undefined;
      return { id: `c${i}`, start, price: shares[i]!, outcome, refund: st?.refund ?? 0 };
    }),
  };
}

export function demoTeacherEarnings(now = new Date()) {
  const paidClasses = 63;
  const rate = commissionRate(paidClasses);
  const rows = Array.from({ length: 14 }, (_, i) => {
    const s = rafi.routine[i % 2]!;
    const share = perClassShares(s.monthlyPrice, s.days.length * 4)[0]!;
    const outcome: SessionOutcome = i === 5 ? "TEACHER_LATE_OR_SHORT" : i === 9 ? "STUDENT_NO_SHOW" : "COMPLETED";
    const st = settleClass({ classShare: share, outcome, commissionRate: rate });
    const date = new Date(now.getTime() - i * 1.2 * 86_400_000);
    return { id: `r${i}`, date, subjects: s.subjects, batchSize: s.batchSize, outcome, pending: i < 2, ...st };
  });
  const released = rows.filter((r) => !r.pending);
  const sum = (k: "teacherGross" | "platform" | "teacherNet" | "refund", list = released) => list.reduce((a, r) => a + r[k], 0);
  const paidOut = Math.floor(sum("teacherNet") * 0.6);
  return {
    rate,
    paidClasses,
    gross: sum("teacherGross"),
    commission: sum("platform"),
    net: sum("teacherNet"),
    lost: sum("refund"),
    pending: sum("teacherNet", rows.filter((r) => r.pending)),
    paidOut,
    available: sum("teacherNet") - paidOut,
    rows,
  };
}
