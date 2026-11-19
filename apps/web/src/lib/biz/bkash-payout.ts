import "server-only";

/**
 * bKash B2C Payout (Disbursement): sends money from the merchant's disbursement
 * wallet to a personal bKash number. This is a SEPARATE permission on the merchant
 * account; bKash enables it on request and gives payout credentials.
 *
 * Env (fall back to the checkout keys when the payout ones are not set):
 *   BKASH_PAYOUT_BASE_URL   live https://checkout.pay.bka.sh/v1.2.0-beta, sandbox https://checkout.sandbox.bka.sh/v1.2.0-beta
 *   BKASH_PAYOUT_APP_KEY / _APP_SECRET / _USERNAME / _PASSWORD
 *   BKASH_PAYOUT_TOPUP=on   move the amount Collection → Disbursement before each payout
 *
 * Endpoints (bKash Checkout v1.2.0-beta): token/grant, payment/b2cPayout,
 * payment/intraAccountTransfer, payment/organizationBalance. Confirm against the
 * document bKash shares when it enables payout; paths are kept in one place below.
 */
const env = (k: string) => (process.env[`BKASH_PAYOUT_${k}`] ?? process.env[`BKASH_${k}`] ?? "").trim();
const BASE = (process.env.BKASH_PAYOUT_BASE_URL ?? "https://checkout.sandbox.bka.sh/v1.2.0-beta").replace(/\/$/, "");
const KEY = env("APP_KEY"), SECRET = env("APP_SECRET"), USER = env("USERNAME"), PASS = env("PASSWORD");

/** Payout runs automatically only when bKash payout is switched on with BKASH_PAYOUT_BASE_URL. */
export const PAYOUT_LIVE = Boolean(process.env.BKASH_PAYOUT_BASE_URL && KEY && SECRET && USER && PASS);

let cached: { token: string; until: number } | null = null;

async function token(): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.token;
  const r = await fetch(`${BASE}/checkout/token/grant`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", username: USER, password: PASS },
    body: JSON.stringify({ app_key: KEY, app_secret: SECRET }),
  });
  const j = (await r.json().catch(() => ({}))) as { id_token?: string; expires_in?: number; errorMessage?: string; statusMessage?: string };
  if (!j.id_token) throw new Error(`bkash-payout-token: ${j.errorMessage ?? j.statusMessage ?? r.status}`);
  cached = { token: j.id_token, until: Date.now() + Math.max(60, (j.expires_in ?? 3600) - 120) * 1000 };
  return j.id_token;
}

async function call(path: string, body?: Record<string, unknown>) {
  const r = await fetch(`${BASE}/checkout/${path}`, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", accept: "application/json", authorization: await token(), "x-app-key": KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await r.json().catch(() => ({}))) as Record<string, string | undefined>;
}

export interface PayoutResult { ok: boolean; trxID?: string; error?: string }

export async function b2cPayout(o: { amount: number; msisdn: string; invoice: string }): Promise<PayoutResult> {
  try {
    if (process.env.BKASH_PAYOUT_TOPUP === "on") {
      const t = await call("payment/intraAccountTransfer", { amount: String(o.amount), currency: "BDT", transferType: "Collection2Disbursement" });
      if (t.transactionStatus !== "Completed") return { ok: false, error: `topup: ${t.errorMessage ?? t.statusMessage ?? "failed"}` };
    }
    const j = await call("payment/b2cPayout", { amount: String(o.amount), currency: "BDT", merchantInvoiceNumber: o.invoice, receiverMSISDN: o.msisdn });
    if (j.transactionStatus === "Completed" && j.trxID) return { ok: true, trxID: j.trxID };
    return { ok: false, error: j.errorMessage ?? j.statusMessage ?? "payout failed" };
  } catch (e) {
    return { ok: false, error: (e as Error).message.slice(0, 200) };
  }
}
