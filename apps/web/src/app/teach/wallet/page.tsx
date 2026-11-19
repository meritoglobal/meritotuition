import { TierLadder } from "@/components/TierLadder";
import { getSettings } from "@/lib/admin/settings";
import { getUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/batches";
import { releaseDue, wallet } from "@/lib/biz/earnings";
import { MIN_WITHDRAW, PAYOUT_LIVE } from "@/lib/biz/payout";
import { bizCopy } from "@/lib/copy-biz";
import { toolsCopy } from "@/lib/copy-tools";
import { DATA_LIVE } from "@/lib/data";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { saveNumber, takeOut } from "./actions";
import { NumberForm, WithdrawForm } from "./Forms";

export const dynamic = "force-dynamic";

export default async function Wallet() {
  if (!DATA_LIVE) return null; // the layout shows the setup note
  const lang = await getLang();
  const c = bizCopy(lang);
  const w0 = c.wallet;
  const u = (await getUser())!;
  if (!(await getProfile(u.id))) {
    const t = toolsCopy(lang).teach;
    return <div className="rounded-lg bg-mist p-6 text-center text-sm text-ink-2">{t.setupProfile} <a href="/teach/profile" className="font-semibold underline">{t.setupBtn}</a></div>;
  }
  await releaseDue(new Date(), u.id).catch(() => null); // classes that just finished count right away
  const w = await wallet(u.id);
  const tk = (x: number) => L.taka(x, lang);
  const nt = w.tier.next;
  return (
    <div>
      <h1 className="font-display text-3xl">{w0.h1}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-2">{w0.sub}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-board p-5 text-white"><div className="text-sm text-white/70">{w0.balance}</div><div className="font-display text-4xl">{tk(w.balance)}</div></div>
        <div className="card p-5"><div className="text-sm text-ink-2">{w0.held}</div><div className="font-display text-3xl">{tk(w.held)}</div></div>
        <div className="card p-5 text-sm">
          <div className="flex justify-between"><span>{w0.earned}</span><b>{tk(w.totals.earned)}</b></div>
          <div className="flex justify-between text-ink-2"><span>{w0.commission}</span><span>{tk(w.totals.commission)}</span></div>
          <div className="flex justify-between text-ink-2"><span>{w0.withdrawn}</span><span>{tk(w.totals.withdrawn)}</span></div>
        </div>
      </div>
      {w.emptyClasses > 0 && <p className="mt-3 rounded-lg bg-redpen-tint p-3 text-sm text-redpen">{w0.empty(w.emptyClasses)}</p>}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <WithdrawForm action={takeOut} balance={w.balance} min={MIN_WITHDRAW} hasNumber={Boolean(w.bkashNumber)} />
        <NumberForm action={saveNumber} number={w.bkashNumber} auto={w.autoPayout} />
      </div>
      {!PAYOUT_LIVE && <p className="mt-2 text-xs text-ink-3">{w0.manual}</p>}

      <section className="mt-8">
        <h2 className="font-display text-2xl">{c.tiers.h}</h2>
        <p className="mt-1 text-sm text-ink-2">
          {w0.tier(w.tier.tier.label[lang], w.tier.tier.rate)} · {w0.students(w.tier.students)}.{" "}
          {!nt ? w0.top : nt.needsExpert ? w0.nextExpert(nt.need, nt.tier.rate) : w0.next(nt.need, nt.tier.label[lang], nt.tier.rate)}
        </p>
        <div className="mt-3"><TierLadder lang={lang} current={w.tier.tier.code} tiers={(await getSettings()).tiers} /></div>
        <p className="mt-2 text-xs text-ink-3">{w0.zeroCost}</p>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="font-semibold">{w0.history}</h2>
          {w.entries.length === 0 ? <p className="mt-2 text-sm text-ink-3">{w0.noHistory}</p> : (
            <ul className="mt-2 divide-y divide-line text-sm">
              {w.entries.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <b>{w0.kind[e.kind]}</b> <span className="text-ink-3">· {L.dateTime(new Date(e.created_at), lang)}</span>
                    {e.kind === "EARNING" && e.gross != null && e.commission != null && e.rate != null && <span className="block text-xs text-ink-3">{w0.cut(e.gross, e.commission, Number(e.rate))}</span>}
                  </span>
                  <span className={`shrink-0 font-semibold ${e.amount < 0 ? "text-redpen" : "text-leaf"}`}>{e.amount < 0 ? "−" : "+"}{tk(Math.abs(e.amount))}</span>
                </li>
              ))}
            </ul>
          )}
          {w.withdrawals.length > 0 && (
            <>
              <h2 className="mt-6 font-semibold">{w0.payouts}</h2>
              <ul className="mt-2 divide-y divide-line text-sm">
                {w.withdrawals.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-3 py-2">
                    <span>{tk(x.amount)} → {x.msisdn} <span className="text-ink-3">· {L.date(new Date(x.created_at), lang)}{x.trx_id ? ` · ${x.trx_id}` : ""}</span></span>
                    <span className={`tag ${x.status === "PAID" ? "bg-home text-home-ink" : x.status === "FAILED" ? "bg-redpen-tint text-redpen" : "bg-mist"}`}>{w0.wStatus[x.status]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <section className="card h-fit p-5">
          <h2 className="font-semibold">{w0.how}</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-ink-2">{w0.howSteps.map((s) => <li key={s}>{s}</li>)}</ol>
        </section>
      </div>
    </div>
  );
}
