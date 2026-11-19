import { Off } from "@/components/growth/Off";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE, db } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { SITE } from "@/lib/growth/notify";
import { claimReferral, mustMe } from "@/lib/growth/page";
import { creditBalance, myCode, REFERRAL_REWARD, type Coupon } from "@/lib/growth/referral";
import { applyCode, createCoupon, toggleCoupon } from "./actions";
import { ApplyCode, CopyLink, NewCoupon } from "./Forms";

export const dynamic = "force-dynamic";

export default async function Refer() {
  const m = await mustMe("/refer");
  const lang = await getLang();
  const g = growthCopy(lang);
  const c = g.refer;
  if (!DATA_LIVE) return <div className="mx-auto max-w-4xl px-5 py-10"><h1 className="font-display text-4xl">{c.h1}</h1><Off text={g.off} /></div>;
  await claimReferral(m.email);
  const s = db();
  const [code, balance, friends, mine, coupons] = await Promise.all([
    myCode(m.email),
    creditBalance(m.email),
    s.from("referrals").select("referee_email,status,created_at").eq("referrer_email", m.email).order("created_at", { ascending: false }).then((r) => r.data ?? []),
    s.from("referrals").select("referrer_email").eq("referee_email", m.email).maybeSingle().then((r) => r.data),
    m.admin ? s.from("coupons").select("*").order("created_at", { ascending: false }).limit(50).then((r) => (r.data ?? []) as Coupon[]) : Promise.resolve([] as Coupon[]),
  ]);
  const link = `${SITE}/?ref=${code}`;
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="font-display text-4xl">{c.h1}</h1>
      <p className="mt-2 max-w-2xl text-ink-2">{c.sub(REFERRAL_REWARD)}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <div className="text-xs text-ink-3">{c.code}</div>
          <div className="select-all font-mono text-4xl font-bold tracking-widest">{code}</div>
          <div className="mt-4 text-xs text-ink-3">{c.link}</div>
          <CopyLink link={link} />
          <a href={`https://wa.me/?text=${encodeURIComponent(c.shareText(link))}`} target="_blank" rel="noreferrer" className="btn-board mt-3 w-full">{c.share}</a>
        </section>
        <section className="card bg-gold-tint p-5">
          <div className="text-xs text-ink-2">{c.balance}</div>
          <div className="text-4xl font-bold">{L.taka(Math.max(0, balance), lang)}</div>
          {!mine && (
            <div className="mt-5">
              <div className="text-sm font-medium">{c.haveCode}</div>
              <ApplyCode action={applyCode} />
            </div>
          )}
        </section>
      </div>

      <h2 className="mt-8 font-display text-2xl">{c.friends}</h2>
      {friends.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.noFriends}</p> : (
        <ul className="card mt-3 divide-y divide-line text-sm">
          {friends.map((f) => (
            <li key={f.referee_email} className="flex items-center justify-between gap-2 p-3">
              <span>{f.referee_email.replace(/^(.{2}).*(@.*)$/, "$1•••$2")}</span>
              <span className={`tag ${f.status === "REWARDED" ? "bg-home text-home-ink" : "bg-mist"}`}>{f.status === "REWARDED" ? `${c.rewarded} +${L.taka(REFERRAL_REWARD, lang)}` : c.joined}</span>
            </li>
          ))}
        </ul>
      )}

      {m.admin && (
        <section className="card mt-10 p-5">
          <h2 className="font-semibold">{c.adminH}</h2>
          <NewCoupon action={createCoupon} />
          <ul className="mt-4 divide-y divide-line text-sm">
            {coupons.map((k) => (
              <li key={k.code} className={`flex items-center gap-3 py-2 ${k.active ? "" : "opacity-50"}`}>
                <b className="font-mono">{k.code}</b>
                <span>{k.percent_off ? `${L.num(k.percent_off, lang)}%` : L.taka(k.amount_off ?? 0, lang)}</span>
                <span className="text-ink-3">{c.cUsed(k.used, k.max_uses)}</span>
                {k.expires_at && <span className="text-ink-3">{L.date(new Date(k.expires_at), lang)}</span>}
                <form action={toggleCoupon.bind(null, k.code, !k.active)} className="ml-auto"><button className="underline">{k.active ? growthCopy(lang).pkg.turnOff : growthCopy(lang).pkg.turnOn}</button></form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
