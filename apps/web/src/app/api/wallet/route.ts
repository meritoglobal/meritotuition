import { fail, json } from "@/lib/api";
import { getProfile } from "@/lib/batches";
import { DATA_LIVE } from "@/lib/data";
import { releaseDue, wallet } from "@/lib/biz/earnings";
import { MIN_WITHDRAW, PAYOUT_LIVE, saveWalletNumber, setAutoPayout, withdraw } from "@/lib/biz/payout";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/**
 * Tutor wallet.
 * GET → { balance, held, tier: { tier, students, expert, next }, entries, withdrawals, bkashNumber, autoPayout, totals, emptyClasses, minWithdraw, payoutLive }
 * POST { action: "withdraw", amount } → { id, status: "PAID" | "QUEUED" | "FAILED" } or { error: "number" | "min" | "balance" | "bad" }
 * POST { action: "number", number, autoPayout? } → { number } · POST { action: "auto", on }
 */
async function tutor() {
  const m = await me();
  if (!m) return { err: fail("login", 401) };
  if (!DATA_LIVE) return { err: fail("data-off", 503) };
  if (!(await getProfile(m.user.id))) return { err: fail("not-tutor", 403) };
  return { m };
}

export async function GET() {
  const t = await tutor();
  if (!t.m) return t.err;
  await releaseDue(new Date(), t.m.user.id).catch(() => null); // settle finished classes right away
  return json({ ...(await wallet(t.m.user.id)), minWithdraw: MIN_WITHDRAW, payoutLive: PAYOUT_LIVE });
}

export async function POST(req: Request) {
  const t = await tutor();
  if (!t.m) return t.err;
  const b = (await req.json().catch(() => ({}))) as { action?: string; amount?: number; number?: string; autoPayout?: boolean; on?: boolean };
  if (b.action === "withdraw") {
    const r = await withdraw(t.m.user.id, t.m.email, Number(b.amount));
    return "error" in r ? fail(r.error, 400) : json(r);
  }
  if (b.action === "number") {
    const n = await saveWalletNumber(t.m.user.id, t.m.email, String(b.number ?? ""), b.autoPayout);
    return n ? json({ number: n }) : fail("bad-number", 400);
  }
  if (b.action === "auto") { await setAutoPayout(t.m.user.id, b.on !== false); return json({ ok: true }); }
  return fail("bad-action", 400);
}
