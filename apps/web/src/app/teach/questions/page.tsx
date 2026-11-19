import Link from "next/link";
import { DATA_LIVE } from "@/lib/data";
import { getUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/batches";
import { growthCopy } from "@/lib/copy-growth";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { DOUBT_PRICE, DOUBT_TUTOR_SHARE, openForTutor, tutorDoubts } from "@/lib/growth/ask";
import { keyOf } from "@/lib/growth/people";
import { claimQ } from "./actions";

export const dynamic = "force-dynamic";

export default async function TeachQuestions() {
  if (!DATA_LIVE) return null; // the layout shows the setup note
  const u = (await getUser())!;
  const lang = await getLang();
  const c = growthCopy(lang).ask;
  const profile = await getProfile(u.id);
  const [open, mine] = await Promise.all([openForTutor(profile?.subjects ?? []), tutorDoubts(keyOf(u))]);
  return (
    <div>
      <h1 className="font-display text-3xl">{c.qH}</h1>
      <p className="mt-1 text-sm text-ink-2">{c.qSub(Math.round(DOUBT_PRICE * DOUBT_TUTOR_SHARE))}</p>
      {open.length === 0 ? <p className="mt-6 text-sm text-ink-3">{c.qNone}</p> : (
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {open.map((d) => (
            <li key={d.id} className="card p-4">
              <div className="text-xs text-ink-3">{L.subject(d.subject, lang)} · {L.dateTime(new Date(d.created_at), lang)}{d.image_path ? " · 📷" : ""}</div>
              <p className="mt-1 line-clamp-3 text-sm">{d.text || "—"}</p>
              <form action={claimQ.bind(null, d.id)} className="mt-3"><button className="btn-gold px-3! py-1.5! text-sm">{c.claim}</button></form>
            </li>
          ))}
        </ul>
      )}
      {mine.length > 0 && (
        <>
          <h2 className="mt-10 font-semibold">{c.myQ}</h2>
          <ul className="card mt-2 divide-y divide-line text-sm">
            {mine.map((d) => (
              <li key={d.id}><Link href={`/ask/${d.id}`} className="flex justify-between gap-2 p-3 hover:bg-mist"><span className="truncate">{d.text || L.subject(d.subject, lang)}</span><span className="tag bg-mist">{c.status[d.status]}</span></Link></li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
