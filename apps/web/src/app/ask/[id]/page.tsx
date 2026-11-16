import Link from "next/link";
import { notFound } from "next/navigation";
import type { ClassLevel } from "@mastermoshai/core";
import { Answer, Flash } from "@/components/growth/Off";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { AI_DAILY, DOUBT_PRICE, getDoubt, imageUrl } from "@/lib/growth/ask";
import { mustMe } from "@/lib/growth/page";
import { PAY_ON } from "@/lib/growth/pay";
import { toTutor } from "../actions";
import TutorAnswer from "@/app/teach/questions/TutorAnswer";
import { answerQ } from "@/app/teach/questions/actions";

export const dynamic = "force-dynamic";

export default async function DoubtPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { id } = await params;
  const m = await mustMe(`/ask/${id}`);
  if (!DATA_LIVE) notFound();
  const d = await getDoubt(id);
  const asker = d?.asker_email === m.email;
  const tutor = d?.tutor_email === m.email;
  if (!d || (!asker && !tutor)) notFound();
  const lang = await getLang();
  const g = growthCopy(lang);
  const c = g.ask;
  const img = await imageUrl(d);
  const { paid } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href={tutor ? "/teach/questions" : "/ask"} className="text-sm text-ink-2">← {tutor ? g.nav.questions : c.back}</Link>
      {paid === "1" && <Flash tone="ok" text={g.pkg.paid} />}
      {paid === "0" && <Flash tone="bad" text={g.pkg.failed} />}
      <div className="card mt-4 p-5">
        <div className="flex flex-wrap gap-2 text-xs text-ink-3">
          <span>{L.subject(d.subject, lang)} · {L.level(d.level as ClassLevel, lang)}</span><span>· {L.dateTime(new Date(d.created_at), lang)}</span>
          <span className="tag bg-mist">{c.status[d.status]}</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img && <img src={img} alt={c.photo} className="mt-3 max-h-96 w-full rounded-lg bg-mist object-contain" />}
        {d.text && <p className="mt-3 whitespace-pre-wrap">{d.text}</p>}
      </div>

      {d.tutor_answer && (
        <section className="card mt-4 border-board p-5">
          <h2 className="mb-2 font-semibold">{c.tutorAns(d.tutor_name ?? "")}</h2>
          <Answer text={d.tutor_answer} />
          {asker && d.tutor_email && <Link href={`/chat/new?to=${encodeURIComponent(d.tutor_email)}`} className="btn-ghost mt-4 px-3! py-1.5! text-sm">{c.chatTutor}</Link>}
        </section>
      )}

      {tutor && d.status === "CLAIMED" && <TutorAnswer action={answerQ.bind(null, d.id)} />}

      <section className="card mt-4 bg-mist/50 p-5">
        <h2 className="mb-2 font-semibold">{c.ai}</h2>
        {d.ai_answer ? <><Answer text={d.ai_answer} /><p className="mt-3 text-xs text-ink-3">{c.aiNote}</p></> : <p className="text-sm text-ink-2">{c.noAi(AI_DAILY)}</p>}
      </section>

      {asker && (d.status === "AI" || d.status === "WAITING_PAYMENT") && (
        <section className="card mt-4 bg-gold-tint p-5">
          <h2 className="font-semibold">{c.tutorH}</h2>
          <p className="mt-1 text-sm text-ink-2">{c.tutorBody(DOUBT_PRICE)}</p>
          {PAY_ON ? <form action={toTutor.bind(null, d.id)} className="mt-3"><button className="btn-gold">{c.askTutor(DOUBT_PRICE)}</button></form> : <p className="mt-2 text-sm text-redpen">{g.pkg.payOff}</p>}
        </section>
      )}
    </div>
  );
}
