import Link from "next/link";
import type { ClassLevel } from "@mastermoshai/core";
import { getUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/batches";
import { marketCopy } from "@/lib/copy-market";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { AREAS, feed, getPrefs, myBids } from "@/lib/growth/requests";
import { savePrefsAction } from "./actions";
import { PrefsForm } from "./Forms";

export const dynamic = "force-dynamic";

export default async function TeachRequests({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  if (!DATA_LIVE) return null; // the layout shows the setup note
  const u = (await getUser())!;
  const lang = await getLang();
  const c = marketCopy(lang).treq;
  const rc = marketCopy(lang).req;
  const all = Boolean((await searchParams).all);
  const t = await getProfile(u.id);
  if (!t || !t.subjects.length) return (
    <div><h1 className="font-display text-3xl">{c.h1}</h1><p className="mt-4 text-sm text-ink-2">{c.noProfile} <Link href="/teach/profile" className="font-semibold underline">{c.profileLink}</Link></p></div>
  );
  const prefs = await getPrefs(t.user_id);
  const [list, bids] = await Promise.all([feed(t, prefs, all), myBids(t.user_id)]);
  return (
    <div>
      <h1 className="font-display text-3xl">{c.h1}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-2">{c.sub}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section>
          <div className="flex gap-2 text-sm">
            <Link href="/teach/requests" className={`tag ${!all ? "bg-board! text-white!" : ""}`}>{c.matched}</Link>
            <Link href="/teach/requests?all=1" className={`tag ${all ? "bg-board! text-white!" : ""}`}>{c.all}</Link>
          </div>
          {list.length === 0 ? <p className="mt-6 rounded-lg bg-mist p-6 text-center text-sm text-ink-2">{c.none}</p> : (
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {list.map((r) => (
                <li key={r.id}>
                  <Link href={`/teach/requests/${r.id}`} className="card block p-4 hover:border-ink-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.invited && <span className="tag bg-gold text-ink">{c.invitedTag}</span>}
                      {r.mine && r.mine.status !== "WITHDRAWN" && <span className="tag bg-mist">{c.bidTag(r.mine.price)}</span>}
                    </div>
                    <div className="mt-1 font-semibold">{L.subject(r.subject, lang)} · {L.level(r.level as ClassLevel, lang)}</div>
                    <div className="text-sm text-ink-2">{r.mode === "HOME" ? L.area(r.area ?? "", lang) : rc.online} · {c.budget(r.budget)} · {rc.daysN(r.days_per_week)}</div>
                    {r.note && <p className="mt-1 line-clamp-2 text-sm text-ink-3">{r.note}</p>}
                    <div className="mt-2 text-xs text-ink-3">{L.dateTime(new Date(r.created_at), lang)} · {c.bidsN(r.bids)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {bids.length > 0 && (
            <>
              <h2 className="mt-10 font-semibold">{c.myBids}</h2>
              <ul className="card mt-2 divide-y divide-line text-sm">
                {bids.map((b) => (
                  <li key={b.id}><Link href={`/teach/requests/${b.request_id}`} className="flex justify-between gap-2 p-3 hover:bg-mist">
                    <span className="truncate">{b.request ? `${L.subject(b.request.subject, lang)} · ${b.request.mode === "HOME" ? L.area(b.request.area ?? "", lang) : rc.online}` : "—"} · {L.taka(b.price, lang)}</span>
                    <span className="tag bg-mist">{c.bidStatus[b.status]}</span>
                  </Link></li>
                ))}
              </ul>
            </>
          )}
        </section>
        <aside><PrefsForm action={savePrefsAction} areas={AREAS} prefs={prefs} /></aside>
      </div>
    </div>
  );
}
