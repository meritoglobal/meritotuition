/**
 * Double-entry ledger. Every money movement is one transaction whose legs sum
 * to zero, so escrow, teacher wallets and platform revenue always reconcile.
 */
import { randomUUID } from "node:crypto";

export type Account = "gateway" | "escrow" | "platform_revenue" | "payout" | `wallet:${string}`;

export interface LedgerLeg {
  txnId: string;
  account: Account;
  amount: number;
  kind: string;
  refId?: string;
  at: Date;
}

export class Ledger {
  readonly legs: LedgerLeg[] = [];

  post(kind: string, legs: { account: Account; amount: number }[], refId?: string): string {
    const sum = legs.reduce((s, l) => s + l.amount, 0);
    if (sum !== 0) throw new Error(`Ledger txn ${kind} does not balance (${sum})`);
    const txnId = randomUUID();
    const at = new Date();
    for (const l of legs) {
      if (l.amount !== 0) this.legs.push({ txnId, kind, refId, at, ...l });
    }
    return txnId;
  }

  balance(account: Account): number {
    return this.legs.filter((l) => l.account === account).reduce((s, l) => s + l.amount, 0);
  }

  sumByKind(account: Account, kind: string): number {
    return this.legs.filter((l) => l.account === account && l.kind === kind).reduce((s, l) => s + l.amount, 0);
  }
}
