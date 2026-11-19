import Link from "next/link";
import { notFound } from "next/navigation";
import { SEGMENT_LABEL, isSegment } from "@mastermoshai/core";
import BuyForm from "@/app/packages/[id]/BuyForm";
import { accessContext } from "@/lib/biz/access";
import { CONTENT_PRICE, lockedSegment } from "@/lib/biz/content-subs";
import { bizCopy } from "@/lib/copy-biz";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE } from "@/lib/data";
import { claimReferral, mustMe } from "@/lib/growth/page";
import { PAY_ON, quote } from "@/lib/growth/pay";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { buySegment } from "../../actions";

export const dynamic = "force-dynamic";

export default async function BuySegment({ params }: { params: Promise<{ segment: string }> }) {
  const { segment } = await params;
  if (!isSegment(segment)) notFound();
  const m = await mustMe(`/learn/buy/${segment}`);
  if (!DATA_LIVE) notFound();
  await claimReferral(m.email);
  const lang = await getLang();
  const c = bizCopy(lang).learn;
  const g = growthCopy(lang).pkg;
  const ctx = await accessContext(m);
  const q = await quote(m.email, CONTENT_PRICE);
  const locked = await lockedSegment(m.email);
  const label = SEGMENT_LABEL[segment][lang];
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Link href={`/learn?segment=${segment}`} className="text-sm text-ink-2">← {c.back}</Link>
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_1.1fr]">
        <section className="card p-5">
          <h1 className="font-display text-2xl">{c.buyH(label)}</h1>
          <p className="mt-1 text-lg font-bold">{L.taka(CONTENT_PRICE, lang)}<span className="text-sm font-normal text-ink-2">{g.perMonth}</span></p>
          <ul className="mt-3 space-y-2 text-sm">
            {c.buyList.map((x) => <li key={x} className="flex gap-2"><span className="mt-[0.6em] h-px w-3 shrink-0 bg-board" />{x}</li>)}
          </ul>
          <p className="mt-4 rounded-lg bg-mist p-3 text-xs text-ink-2">{c.teacherNote}</p>
        </section>
        <section className="card p-5">
          {ctx.segments.includes(segment) ? <p className="font-semibold text-leaf">{c.already}</p> : locked && locked !== segment && !ctx.staff ? (
            <p className="text-sm text-redpen">{c.lockedTo(SEGMENT_LABEL[locked][lang])}</p>
          ) : (
            <>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt>{g.listPrice}</dt><dd>{L.taka(q.listPrice, lang)}</dd></div>
                {q.credit > 0 && <div className="flex justify-between text-leaf"><dt>{g.credit}</dt><dd>−{L.taka(q.credit, lang)}</dd></div>}
                <div className="flex justify-between border-t border-line pt-1 text-base font-bold"><dt>{g.total}</dt><dd>{L.taka(q.amount, lang)}</dd></div>
              </dl>
              {PAY_ON ? <BuyForm action={buySegment.bind(null, segment)} amount={L.taka(q.amount, lang)} /> : <p className="mt-4 text-sm text-redpen">{g.payOff}</p>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
