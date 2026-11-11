import { notFound } from "next/navigation";
import { CLASS_LEVEL_LABEL, DEMO_TEACHERS, WEEKDAY_LABEL, classesPerMonth, formatTaka, timeLabel, upcomingOccurrences } from "@merito/core";

export default async function BookPage({ params, searchParams }: { params: Promise<{ teacherId: string; slotId: string }>; searchParams: Promise<{ trial?: string }> }) {
  const { teacherId, slotId } = await params;
  const { trial } = await searchParams;
  const t = DEMO_TEACHERS.find((x) => x.id === teacherId);
  const s = t?.routine.find((r) => r.id === slotId);
  if (!t || !s) notFound();
  const isTrial = trial === "1";
  const next = upcomingOccurrences(s, new Date(), isTrial ? 1 : 3);
  const fmt = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">{isTrial ? "Book a free trial class" : "Enroll in this batch"}</h1>
      <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
        <Row k="Tutor" v={`${t.name} · ${t.university}`} />
        <Row k="Subjects" v={`${s.subjects.join(", ")} · ${CLASS_LEVEL_LABEL[s.level]}`} />
        <Row k="Routine" v={`${s.days.map((d) => WEEKDAY_LABEL[d]).join(", ")} at ${timeLabel(s.startTime)} · ${s.durationMin} min`} />
        <Row k="Batch" v={`1:${s.batchSize} · ${s.mode === "ONLINE" ? "Online live class in Merito Tuition" : "At your home"}`} />
        <Row k={isTrial ? "Trial class" : "First classes"} v={next.map(fmt).join(" · ")} />
        <hr className="border-slate-100" />
        {isTrial ? (
          <Row k="Price" v="Free" strong />
        ) : (
          <>
            <Row k={`${classesPerMonth(s)} classes (1 month)`} v={formatTaka(s.monthlyPrice)} strong />
            <p className="text-xs text-slate-500">Held safely by Merito Tuition. Released to the tutor one class at a time, 48 hours after each class. Missed classes are refunded.</p>
          </>
        )}
      </div>
      {!isTrial && (
        <div className="mt-6 grid grid-cols-3 gap-2 text-sm">
          {["bKash", "Nagad", "Card"].map((m, i) => (
            <label key={m} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
              <input type="radio" name="pay" defaultChecked={i === 0} className="accent-brand-600" /> {m}
            </label>
          ))}
        </div>
      )}
      <a href="/dashboard/student" className="mt-6 block rounded-full bg-brand-600 py-3 text-center font-semibold text-white hover:bg-brand-700">
        {isTrial ? "Confirm free trial" : `Pay ${formatTaka(s.monthlyPrice)}`}
      </a>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{k}</span>
      <span className={`text-right ${strong ? "text-base font-bold" : "font-medium"}`}>{v}</span>
    </div>
  );
}
