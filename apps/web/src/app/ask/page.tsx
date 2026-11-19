import Link from "next/link";
import { Off } from "@/components/growth/Off";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { AI_DAILY, myDoubts } from "@/lib/growth/ask";
import { mustMe } from "@/lib/growth/page";
import AskForm from "./AskForm";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  const m = await mustMe("/ask");
  const lang = await getLang();
  const g = growthCopy(lang);
  const c = g.ask;
  if (!DATA_LIVE) return <div className="mx-auto max-w-4xl px-5 py-10"><h1 className="font-display text-4xl">{c.h1}</h1><Off text={g.off} /></div>;
  const mine = await myDoubts(m.email);
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="font-display text-4xl">{c.h1}</h1>
      <p className="mt-2 max-w-2xl text-ink-2">{c.sub(AI_DAILY)}</p>
      <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <AskForm />
        <section>
          <h2 className="font-semibold">{c.mine}</h2>
          {mine.length === 0 ? <p className="mt-2 text-sm text-ink-3">{c.none}</p> : (
            <ul className="card mt-2 divide-y divide-line text-sm">
              {mine.map((d) => (
                <li key={d.id}>
                  <Link href={`/ask/${d.id}`} className="block p-3 hover:bg-mist">
                    <div className="truncate font-medium">{d.text || L.subject(d.subject, lang)}</div>
                    <div className="mt-0.5 flex gap-2 text-xs text-ink-3"><span>{L.date(new Date(d.created_at), lang)}</span><span>· {c.status[d.status]}</span></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
