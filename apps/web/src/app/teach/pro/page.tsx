import { getUser } from "@/lib/auth/session";
import { Flash } from "@/components/growth/Off";
import { marketCopy } from "@/lib/copy-market";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { PAY_ON } from "@/lib/growth/pay";
import { PRO_PRICE, proUntil } from "@/lib/growth/pro";
import { buyPro } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  if (!DATA_LIVE) return null; // the layout shows the setup note
  const lang = await getLang();
  const c = marketCopy(lang).pro;
  const { paid } = await searchParams;
  const until = await proUntil((await getUser())!.id);
  const active = until && until > new Date();
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl">{c.h1} <span className="tag bg-gold align-middle text-ink">{c.badge}</span></h1>
      <p className="mt-2 text-ink-2">{c.sub(PRO_PRICE)}</p>
      {paid === "1" && <Flash tone="ok" text={c.paid} />}
      {paid === "0" && <Flash tone="bad" text={PAY_ON ? c.failed : c.off} />}
      <ul className="card mt-5 space-y-2 p-5 text-sm">
        {c.perks.map((p) => <li key={p} className="flex gap-2"><span aria-hidden>✓</span>{p}</li>)}
      </ul>
      <p className="mt-5 font-medium">{active ? c.active(L.date(until, lang)) : c.inactive}</p>
      {PAY_ON && <form action={buyPro} className="mt-3"><button className="btn-gold">{active ? c.extend(PRO_PRICE) : c.buy(PRO_PRICE)}</button></form>}
    </div>
  );
}
