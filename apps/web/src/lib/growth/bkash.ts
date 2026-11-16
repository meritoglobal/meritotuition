import "server-only";

/**
 * bKash Tokenized Checkout (v1.2.0-beta).
 * Env: BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD and
 * BKASH_BASE_URL (defaults to the sandbox; live is https://tokenized.pay.bka.sh/v1.2.0-beta).
 *
 * Modes: "0011" pay once, "0000" save the wallet (agreement), "0001" pay with a saved wallet.
 * A saved wallet makes next month's renewal a one-tap PIN; fully automatic
 * deduction needs bKash's separate recurring-payment approval on the merchant account.
 */
const BASE = (process.env.BKASH_BASE_URL ?? "https://tokenized.sandbox.bka.sh/v1.2.0-beta").replace(/\/$/, "");
const KEY = process.env.BKASH_APP_KEY ?? "";
const SECRET = process.env.BKASH_APP_SECRET ?? "";
const USER = process.env.BKASH_USERNAME ?? "";
const PASS = process.env.BKASH_PASSWORD ?? "";

export const BKASH_LIVE = Boolean(KEY && SECRET && USER && PASS);

let cached: { token: string; until: number } | null = null;

async function token(): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.token;
  const r = await fetch(`${BASE}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", username: USER, password: PASS },
    body: JSON.stringify({ app_key: KEY, app_secret: SECRET }),
  });
  const j = (await r.json().catch(() => ({}))) as { id_token?: string; expires_in?: number; statusMessage?: string };
  if (!j.id_token) throw new Error(`bkash-token: ${j.statusMessage ?? r.status}`);
  cached = { token: j.id_token, until: Date.now() + Math.max(60, (j.expires_in ?? 3600) - 120) * 1000 };
  return j.id_token;
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T & { statusCode?: string; statusMessage?: string }> {
  const r = await fetch(`${BASE}/tokenized/checkout/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", authorization: await token(), "x-app-key": KEY },
    body: JSON.stringify(body),
  });
  return (await r.json().catch(() => ({}))) as T & { statusCode?: string; statusMessage?: string };
}

export type BkashMode = "0011" | "0000" | "0001";

export async function createPayment(o: { mode: BkashMode; payerReference: string; callbackURL: string; amount?: number; invoice?: string; agreementID?: string }) {
  const body: Record<string, unknown> = { mode: o.mode, payerReference: o.payerReference.slice(0, 50), callbackURL: o.callbackURL };
  if (o.mode !== "0000") Object.assign(body, { amount: String(o.amount), currency: "BDT", intent: "sale", merchantInvoiceNumber: o.invoice });
  if (o.mode === "0001") body.agreementID = o.agreementID;
  const j = await call<{ paymentID?: string; bkashURL?: string }>("create", body);
  if (!j.paymentID || !j.bkashURL) throw new Error(`bkash-create: ${j.statusMessage ?? "failed"}`);
  return { paymentID: j.paymentID, url: j.bkashURL };
}

export interface Executed {
  ok: boolean; agreementID?: string; trxID?: string; msisdn?: string; amount?: number; message?: string;
}

/** Finish a payment or agreement after the payer comes back with status=success. */
export async function execute(paymentID: string): Promise<Executed> {
  let j = await call<{ agreementID?: string; agreementStatus?: string; trxID?: string; transactionStatus?: string; customerMsisdn?: string; amount?: string }>("execute", { paymentID });
  // A network hiccup after bKash finished: ask for the status instead of failing the payer.
  if (!j.statusCode || (j.statusCode !== "0000" && !j.transactionStatus)) {
    const q = await call<typeof j>("payment/status", { paymentID }).catch(() => null);
    if (q?.transactionStatus) j = q;
  }
  const ok = j.transactionStatus === "Completed" || j.agreementStatus === "Completed";
  return { ok, agreementID: j.agreementID, trxID: j.trxID, msisdn: j.customerMsisdn, amount: j.amount ? Number(j.amount) : undefined, message: j.statusMessage };
}
