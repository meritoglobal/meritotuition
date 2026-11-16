import Link from "next/link";
import { notFound } from "next/navigation";
import type { ClassLevel } from "@mastermoshai/core";
import { getUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/batches";
import { marketCopy } from "@/lib/copy-market";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { isUuid } from "@/lib/growth/people";
import { getRequest, isLive, myBid, tutorMaySee } from "@/lib/growth/requests";
import { bid, messageStudent, withdraw } from "../actions";
import { BidForm } from "../Forms";

export const dynamic = "force-dynamic";

export default async function TeachRequest({ params }: { params: Promise<{ id: string }> }) {
  if (!DATA_LIVE) return null;
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const u = (await getUser())!;
  const lang = await getLang();
  const c = marketCopy(lang).treq;
  const rc = marketCopy(lang).req;
  const [t, r] = await Promise.all([getProfile(u.id), getRequest(id)]);
  if (!r) notFound();
  if (!t) return <p className="text-sm">{c.noProfile} <Link href="/teach/profile" className="underline">{c.profileLink}</Link></p>;
  const may = await tutorMaySee(r, t);
  const mine = await myBid(r.id, t.user_id);
  const live = isLive(r);
  return (
    <div className="max-w-3xl">
      <Link href="/teach/requests" className="text-sm text-ink-3 hover:text-ink">← {c.h1}</Link>
      <h1 className="mt-2 font-display text-3xl">{L.subject(r.subject, lang)} · {L.level(r.level as ClassLevel, lang)}</h1>
      <p className="mt-1 text-ink-2">{r.mode === "HOME" ? `${rc.home}, ${L.area(r.area ?? "", lang)}` : rc.online} · {c.budget(r.budget)} · {rc.daysN(r.days_per_week)}</p>
      <p className="mt-1 text-sm text-ink-3">{r.student_name} · {L.dateTime(new Date(r.created_at), lang)}</p>
      {r.note && <p className="mt-3 rounded-lg bg-mist p-3 text-sm">“{r.note}”</p>}
      {!may ? <p className="mt-6 text-sm text-redpen">{c.cant}</p> : (
        <>
          {mine && <p className="mt-4 text-sm"><span className="tag bg-mist">{c.bidStatus[mine.status]}</span> {L.taka(mine.price, lang)}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {r.status !== "CLOSED" && <form action={messageStudent.bind(null, r.id)}><button className="btn-board px-3! py-1.5! text-sm">{c.message}</button></form>}
            {live && mine?.status === "PENDING" && <form action={withdraw.bind(null, r.id)}><button className="btn-ghost px-3! py-1.5! text-sm">{c.withdraw}</button></form>}
          </div>
          {live && mine?.status !== "ACCEPTED" ? (
            <div className="mt-6"><BidForm action={bid.bind(null, r.id)} price={mine && mine.status !== "WITHDRAWN" ? mine.price : undefined} message={mine?.message} budget={r.budget} /></div>
          ) : !live && mine?.status !== "ACCEPTED" ? <p className="mt-6 text-sm text-ink-3">{c.closed}</p> : null}
        </>
      )}
    </div>
  );
}
