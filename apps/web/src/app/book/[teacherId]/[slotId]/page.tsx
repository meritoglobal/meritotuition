import { notFound } from "next/navigation";
import { DEMO_TEACHERS, classesPerMonth, upcomingOccurrences } from "@mastermoshai/core";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";

export default async function BookPage({ params, searchParams }: { params: Promise<{ teacherId: string; slotId: string }>; searchParams: Promise<{ trial?: string }> }) {
  const { teacherId, slotId } = await params;
  const { trial } = await searchParams;
  const t = DEMO_TEACHERS.find((x) => x.id === teacherId);
  const s = t?.routine.find((r) => r.id === slotId);
  if (!t || !s) notFound();
  const lang = await getLang();
  const c = copy(lang).book;
  const isTrial = trial === "1";
  const next = upcomingOccurrences(s, new Date(), isTrial ? 1 : 3);
  const fmt = (d: Date) => L.dateTime(d, lang);
  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <h1 className="font-display text-4xl">{isTrial ? c.h1Trial : c.h1Enroll}</h1>
      <div className="card mt-6 space-y-3 p-5 text-[15px]">
        <Row k={c.tutor} v={`${L.name(t, lang)} · ${L.uni(t.university, lang)}`} />
        <Row k={c.subjects} v={`${L.subjects(s.subjects, lang)} · ${L.level(s.level, lang)}`} />
        <Row k={c.routine} v={`${s.days.map((d) => L.day(d, lang)).join(", ")} ${c.at} ${L.time(s.startTime, lang)} · ${copy(lang).routine.min(s.durationMin)}`} />
        <Row k={c.batch} v={`${L.num(`1:${s.batchSize}`, lang)} · ${s.mode === "ONLINE" ? c.online : c.home}`} />
        <Row k={isTrial ? c.trialClass : c.firstClasses} v={next.map(fmt).join(" · ")} />
        <hr className="border-line" />
        {isTrial ? (
          <Row k={c.price} v={c.free} strong />
        ) : (
          <>
            <Row k={c.month(classesPerMonth(s))} v={L.taka(s.monthlyPrice, lang)} strong />
            <p className="text-xs text-ink-2">{c.note}</p>
          </>
        )}
      </div>
      {!isTrial && (
        <div className="mt-6 grid grid-cols-3 gap-2 text-sm">
          {c.pay.map((m, i) => (
            <label key={m} className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-paper py-3 font-semibold has-[:checked]:border-board has-[:checked]:bg-home">
              <input type="radio" name="pay" defaultChecked={i === 0} className="accent-board" /> {m}
            </label>
          ))}
        </div>
      )}
      <a href="/dashboard/student" className="btn-gold mt-6 w-full text-base">
        {isTrial ? c.confirmTrial : c.payBtn(L.taka(s.monthlyPrice, lang))}
      </a>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-2">{k}</span>
      <span className={`text-right ${strong ? "text-xl font-bold" : "font-medium"}`}>{v}</span>
    </div>
  );
}
