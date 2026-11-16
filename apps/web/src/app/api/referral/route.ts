import { fail, json } from "@/lib/api";
import { DATA_LIVE, db } from "@/lib/data";
import { SITE } from "@/lib/growth/notify";
import { me } from "@/lib/growth/people";
import { attachReferral, creditBalance, myCode, REFERRAL_REWARD } from "@/lib/growth/referral";

export const dynamic = "force-dynamic";

/** GET → { code, link, reward, balance, friends: [{ email (masked), status }] } */
export async function GET() {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const [code, balance, friends] = await Promise.all([
    myCode(m.email), creditBalance(m.email),
    db().from("referrals").select("referee_email,status,created_at").eq("referrer_email", m.email).order("created_at", { ascending: false }).then((r) => r.data ?? []),
  ]);
  return json({
    code, link: `${SITE}/?ref=${code}`, reward: REFERRAL_REWARD, balance: Math.max(0, balance),
    friends: friends.map((f) => ({ email: f.referee_email.replace(/^(.{2}).*(@.*)$/, "$1•••$2"), status: f.status, at: f.created_at })),
  });
}

/** POST { code } → apply a friend's code (new users only). */
export async function POST(req: Request) {
  const m = await me();
  if (!m) return fail("login", 401);
  if (!DATA_LIVE) return fail("data-off", 503);
  const b = (await req.json().catch(() => ({}))) as { code?: string };
  return (await attachReferral(m.email, String(b.code ?? ""))) ? json({ ok: true }) : fail("bad-code", 400);
}
