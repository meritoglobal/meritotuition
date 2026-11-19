import { Off } from "@/components/growth/Off";
import { ScheduleChangeCard } from "@/components/ScheduleChangeCard";
import { myChanges } from "@/lib/biz/schedule";
import { bizCopy } from "@/lib/copy-biz";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE } from "@/lib/data";
import { mustMe } from "@/lib/growth/page";
import { getLang } from "@/lib/lang";
import { answer } from "./actions";

export const dynamic = "force-dynamic";

export default async function Routine() {
  const m = await mustMe("/routine");
  const lang = await getLang();
  const c = bizCopy(lang).routine;
  if (!DATA_LIVE) return <div className="mx-auto max-w-3xl px-5 py-10"><h1 className="font-display text-4xl">{c.h1}</h1><Off text={growthCopy(lang).off} /></div>;
  const list = await myChanges(m.email);
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="font-display text-4xl">{c.h1}</h1>
      <p className="mt-2 text-ink-2">{c.sub}</p>
      {list.length === 0 ? <p className="mt-6 text-sm text-ink-3">{c.none}</p> : (
        <div className="mt-6 grid gap-3">
          {list.map((ch) => {
            const mine = (ch.votes ?? []).find((v) => v.email === m.email);
            return (
              <ScheduleChangeCard key={ch.id} ch={ch} lang={lang}>
                {ch.status === "PENDING" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {mine && <span className="text-sm text-ink-2">{c.youSaid(mine.vote)}</span>}
                    <form action={answer.bind(null, ch.id, "APPROVE")}><button className="btn-board px-4! py-1.5!">{c.approve}</button></form>
                    <form action={answer.bind(null, ch.id, "REJECT")}><button className="btn-ghost px-4! py-1.5! text-redpen">{c.reject}</button></form>
                  </div>
                )}
              </ScheduleChangeCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
