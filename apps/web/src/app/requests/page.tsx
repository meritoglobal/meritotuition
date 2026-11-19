import Link from "next/link";
import { Off } from "@/components/growth/Off";
import { growthCopy } from "@/lib/copy-growth";
import { marketCopy } from "@/lib/copy-market";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import type { ClassLevel } from "@mastermoshai/core";
import { mustMe } from "@/lib/growth/page";
import { AREAS, isLive, myRequests } from "@/lib/growth/requests";
import { post } from "./actions";
import NewRequest from "./NewRequest";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const m = await mustMe("/requests");
  const lang = await getLang();
  const c = marketCopy(lang).req;
  if (!DATA_LIVE) return <div className="mx-auto max-w-4xl px-5 py-10"><h1 className="font-display text-4xl">{c.h1}</h1><Off text={growthCopy(lang).off} /></div>;
  const list = await myRequests(m.email);
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="font-display text-4xl">{c.h1}</h1>
      <p className="mt-2 max-w-2xl text-ink-2">{c.sub}</p>
      <div className="mt-6 grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <NewRequest action={post} areas={AREAS} />
        <section>
          <h2 className="font-semibold">{c.mine}</h2>
          {list.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.none}</p> : (
            <ul className="card mt-2 divide-y divide-line text-sm">
              {list.map((r) => (
                <li key={r.id}>
                  <Link href={`/requests/${r.id}`} className="block p-3 hover:bg-mist">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{L.subject(r.subject, lang)} · {L.level(r.level as ClassLevel, lang)}</span>
                      <span className="tag bg-mist">{r.status === "OPEN" && !isLive(r) ? c.expired : c.status[r.status]}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-ink-3">{r.mode === "HOME" ? L.area(r.area ?? "", lang) : c.online} · {c.perMonth(r.budget)} · {c.bidsN(r.bids)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-sm text-ink-2">{c.search} <Link href="/teachers" className="font-semibold underline">{c.searchLink}</Link></p>
        </section>
      </div>
    </div>
  );
}
