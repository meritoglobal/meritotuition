import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash } from "@/components/growth/Off";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { me } from "@/lib/growth/people";
import { PAY_ON } from "@/lib/growth/pay";
import { board, canTake, forStudent, getTest, isOpen, myAttempt } from "@/lib/growth/tests";
import { buyTest, startTest } from "../actions";
import { Board } from "../Board";
import { StartForm, TestRunner } from "./Runner";

export const dynamic = "force-dynamic";

export default async function TestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { id } = await params;
  if (!DATA_LIVE) notFound();
  const t = await getTest(id);
  if (!t || !t.published) notFound();
  const lang = await getLang();
  const g = growthCopy(lang);
  const c = g.test;
  const m = await me();
  const [attempt, ranks] = await Promise.all([m ? myAttempt(t.id, m.email) : null, board(t.id, m?.email)]);
  const open = isOpen(t);
  const allowed = m ? await canTake(t, m.email) : false;
  const { paid } = await searchParams;

  let body: React.ReactNode;
  if (attempt?.submitted_at) {
    const answers = attempt.answers ?? {};
    body = (
      <div>
        <div className="rounded-xl bg-board p-6 text-white">
          <div className="text-3xl font-bold">{c.yours(Number(attempt.score), Number(attempt.max_score))}</div>
          {ranks.mine && <div className="mt-1 text-white/70">{c.rankOf(ranks.mine.rank, ranks.total)} · {c.min(attempt.time_sec ?? 0)}</div>}
        </div>
        <h2 className="mt-6 font-semibold">{c.answers}</h2>
        <ol className="mt-2 space-y-3">
          {t.questions.map((q, i) => {
            const given = answers[q.id];
            const ok = given === q.answer;
            return (
              <li key={q.id} className={`card p-4 ${ok ? "border-leaf/40" : "border-redpen/40"}`}>
                <div className="font-medium">{L.num(i + 1, lang)}. {q.prompt}</div>
                <div className="mt-1 text-sm">
                  <span className="text-leaf">{c.right}: {q.options?.[q.answer ?? -1]}</span>
                  {!ok && <span className="ml-3 text-redpen">{c.yourAns}: {typeof given === "number" ? q.options?.[given] : c.skipped}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  } else if (attempt && open) {
    const ends = new Date(attempt.started_at).getTime() + t.duration_min * 60_000;
    body = <TestRunner testId={t.id} questions={forStudent(t).questions} endsAt={ends} />;
  } else if (!open) {
    body = <p className="rounded-lg bg-mist p-4 text-sm">{c.closed}</p>;
  } else if (!m) {
    body = <Link href={`/login?next=/leaderboard/${t.id}`} className="btn-gold">{c.login}</Link>;
  } else if (!allowed) {
    body = PAY_ON ? <form action={buyTest.bind(null, t.id)}><button className="btn-gold">{c.buy(t.price)}</button></form> : <p className="text-sm text-redpen">{g.pkg.payOff}</p>;
  } else {
    body = <StartForm action={startTest.bind(null, t.id)} name={m.name} />;
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/leaderboard" className="text-sm text-ink-2">← {c.h1}</Link>
      <h1 className="mt-2 font-display text-3xl">{t.title}</h1>
      <p className="text-sm text-ink-3">{L.subject(t.subject, lang)} · {c.qs(t.questions.length)} · {c.minutes(t.duration_min)} · {t.price > 0 ? L.taka(t.price, lang) : c.free}</p>
      {paid === "0" && <Flash tone="bad" text={g.pkg.failed} />}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>{body}</div>
        <section className="card h-fit p-5">
          <h2 className="font-semibold">{c.board}</h2>
          <div className="mt-2"><Board rows={ranks.top} mine={ranks.mine} lang={lang} /></div>
        </section>
      </div>
    </div>
  );
}
