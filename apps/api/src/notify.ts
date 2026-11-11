/** Notification outbox. Production sends Expo push + SMS from a BullMQ worker. */
export interface OutboundNotification {
  userId: string;
  kind: "CLASS_REMINDER" | "CLASS_STARTED" | "PAYMENT" | "FLAG_UPDATE" | "PAYOUT" | "TRIAL_BOOKED";
  title: string;
  body: string;
  data?: Record<string, string>;
  at: Date;
}

export class Notifier {
  readonly sent: OutboundNotification[] = [];
  send(n: Omit<OutboundNotification, "at">): void {
    this.sent.push({ ...n, at: new Date() });
  }
  forUser(userId: string): OutboundNotification[] {
    return this.sent.filter((n) => n.userId === userId);
  }
}
