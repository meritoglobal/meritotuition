import Link from "next/link";
import { notFound } from "next/navigation";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { getPackage } from "@/lib/growth/packages";
import { claimReferral, mustMe } from "@/lib/growth/page";
import { PAY_ON, quote } from "@/lib/growth/pay";
import { buy } from "../actions";
import { PackageCard } from "../PackageCard";
import BuyForm from "./BuyForm";

export const dynamic = "force-dynamic";

export default async function PackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await mustMe(`/packages/${id}`);
  if (!DATA_LIVE) notFound();
  const p = await getPackage(id);
  if (!p?.active) notFound();
  await claimReferral(m.email);
  const lang = await getLang();
  const c = growthCopy(lang).pkg;
  const q = await quote(m.email, p.price);
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/packages" className="text-sm text-ink-2">← {c.h1}</Link>
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_1.1fr]">
        <PackageCard p={p} lang={lang} cta={false} />
        <div className="card p-5">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt>{c.listPrice}</dt><dd>{L.taka(q.listPrice, lang)}</dd></div>
            {q.credit > 0 && <div className="flex justify-between text-leaf"><dt>{c.credit}</dt><dd>−{L.taka(q.credit, lang)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-1 text-base font-bold"><dt>{c.total}</dt><dd>{L.taka(q.amount, lang)}</dd></div>
          </dl>
          {PAY_ON ? <BuyForm action={buy.bind(null, p.id)} amount={L.taka(q.amount, lang)} /> : <p className="mt-4 text-sm text-redpen">{c.payOff}</p>}
        </div>
      </div>
    </div>
  );
}
