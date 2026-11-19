import Link from "next/link";
import { inStoreApp } from "@/lib/store-server";
import { Off } from "@/components/growth/Off";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { me } from "@/lib/growth/people";
import { listTests, monthBoard } from "@/lib/growth/tests";
import { createSample, createTest } from "./actions";
import Admin from "./Admin";
import { Board } from "./Board";

export const dynamic = "force-dynamic";

export default async function Leaderboard() {
  const lang = await getLang();
  const store = await inStoreApp();
  const g = growthCopy(lang);
  const c = g.test;
  if (!DATA_LIVE) return <div className="mx-auto max-w-5xl px-5 py-10"><h1 className="font-display text-4xl">{c.h1}</h1><Off text={g.off} /></div>;
  const m = await me();
  const [tests, month] = await Promise.all([listTests(), monthBoard(m?.email)]);
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="font-display text-4xl">{c.h1}</h1>
      <p className="mt-2 max-w-2xl text-ink-2">{c.sub}</p>
      <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <section>
          <h2 className="font-display text-2xl">{c.tests}</h2>
          {tests.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.none}</p> : (
            <ul className="mt-3 space-y-3">
              {tests.map((t) => (
                <li key={t.id}>
                  <Link href={`/leaderboard/${t.id}`} className="card flex items-center gap-3 p-4 hover:border-ink-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{t.title}</span>
                      <span className="block text-xs text-ink-3">{L.subject(t.subject, lang)} · {c.qs(t.questions.length)} · {c.minutes(t.duration_min)} · {c.takers(t.takers)}</span>
                    </span>
                    {!(store && t.price > 0) && <span className={`tag ${t.price > 0 ? "bg-gold-tint" : "bg-home text-home-ink"}`}>{t.price > 0 ? L.taka(t.price, lang) : c.free}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">{c.month}</h2>
          <div className="mt-2"><Board rows={month} lang={lang} /></div>
        </section>
      </div>
      {m?.admin && <Admin action={createTest} sample={createSample} />}
    </div>
  );
}
