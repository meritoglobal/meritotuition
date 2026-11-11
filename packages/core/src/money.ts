/**
 * Money rules. All amounts are whole BDT (taka) integers so no money is lost to
 * floating point. Rounding always favours the teacher on the teacher/platform
 * split, and any remainder from splitting a plan goes to the earliest classes.
 */

export interface CommissionTier {
  /** Applies while the teacher's completed paid classes are below this number. */
  upTo: number;
  rate: number;
}

/** Default ladder: 25% for the first 50 paid classes, 20% up to 200, 15% after. */
export const DEFAULT_COMMISSION_LADDER: CommissionTier[] = [
  { upTo: 50, rate: 0.25 },
  { upTo: 200, rate: 0.2 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.15 },
];

export function commissionRate(
  completedPaidClasses: number,
  ladder: CommissionTier[] = DEFAULT_COMMISSION_LADDER,
): number {
  for (const tier of ladder) {
    if (completedPaidClasses < tier.upTo) return tier.rate;
  }
  const last = ladder.at(-1);
  if (!last) throw new Error("Commission ladder is empty");
  return last.rate;
}

export interface Split {
  teacher: number;
  platform: number;
}

/** Split a gross amount the teacher earned into the teacher's net and our commission. */
export function splitGross(gross: number, rate: number): Split {
  assertTaka(gross);
  if (rate < 0 || rate >= 1) throw new Error(`Invalid commission rate ${rate}`);
  const platform = Math.floor(gross * rate);
  return { teacher: gross - platform, platform };
}

/**
 * Divide a plan's total into equal per-class shares. 6000 over 12 = 500 each;
 * 1000 over 3 = 334, 333, 333.
 */
export function perClassShares(total: number, classCount: number): number[] {
  assertTaka(total);
  if (!Number.isInteger(classCount) || classCount <= 0) {
    throw new Error(`classCount must be a positive integer, got ${classCount}`);
  }
  const base = Math.floor(total / classCount);
  const remainder = total - base * classCount;
  return Array.from({ length: classCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** What the teacher sees when setting a price: "you receive X of Y". */
export function teacherReceives(price: number, completedPaidClasses: number): Split {
  return splitGross(price, commissionRate(completedPaidClasses));
}

export function formatTaka(amount: number): string {
  return `৳${amount.toLocaleString("en-IN")}`;
}

export function assertTaka(amount: number): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`Amount must be a non-negative whole taka, got ${amount}`);
  }
}
