import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { demoStudentPlan } from "@/lib/demo";
import FlagForm from "./FlagForm";
import Link from "next/link";
import type { ClassLevel } from "@mastermoshai/core";
import { getUser } from "@/lib/auth/session";
import { nextClass, studentBatches } from "@/lib/batches";
import { toolsCopy } from "@/lib/copy-tools";
import { DATA_LIVE } from "@/lib/data";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  COMPLETED: "bg-home text-home-ink",
  TEACHER_NO_SHOW: "bg-redpen-tint text-redpen",
  TEACHER_LATE_OR_SHORT: "bg-gold-tint text-ink",
  STUDENT_NO_SHOW: "bg-mist text-ink-2",
  BOTH_ABSENT: "bg-mist text-ink-2",
};

export default async function StudentDashboard() {
  const lang = await getLang();
  const c = copy(lang).student;
  const plan = demoStudentPlan();
  const fmt = (d: Date) => L.dateTime(d, lang);
  const refunded = plan.classes.reduce((a, c) => a + c.refund, 0);
  const next = plan.classes.find((c) => !c.outcome);
  const past = plan.classes.filter((c) => c.outcome);
  const user = await getUser();
  const t = toolsCopy(lang).teach;
  const mine = DATA_LIVE && user?.email ? await studentBatches(user.email) : [];
  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <h1 className="font-display text-4xl">{c.h1}</h1>

      {mine.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-2xl">{t.myBatches}</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {mine.map((b) => {
              const at = nextClass(b.schedule);
              return (
                <div key={b.id} className="card flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{b.title}</div>
                    <div className="text-xs text-ink-3">{b.teacher_name ? `${t.withT(b.teacher_name)} · ` : ""}{L.subject(b.subject, lang)} · {L.level(b.level as ClassLevel, lang)}</div>
                    {at && <div className="text-xs text-ink-2">{c.next}: {fmt(at)}</div>}
                  </div>
                  <Link href={`/class/${b.class_id}`} className="btn-board px-3! py-1.5! text-sm">{c.open}</Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {next && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl bg-board p-6 text-white">
          <div className="flex-1">
            <div className="text-sm text-white/60">{c.next}</div>
            <div className="text-2xl font-bold">{c.with(L.subjects(plan.slot.subjects, lang), L.name(plan.teacher, lang))}</div>
            <div className="text-sm text-white/60">{fmt(next.start)} · {c.reminder}</div>
          </div>
          <a href="/class/demo" className="btn-gold">{c.open}</a>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat k={c.paid} v={L.taka(plan.paid, lang)} />
        <Stat k={c.done} v={c.of(past.length, plan.classes.length)} />
        <Stat k={c.refunded} v={L.taka(refunded, lang)} />
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">{c.history}</h2>
      <div className="divide-y divide-line card">
        {past.map((k) => {
          const label = c.outcome[k.outcome!] ?? "";
          const cls = TONE[k.outcome!] ?? "";
          return (
            <div key={k.id} className="flex items-center gap-3 p-4 text-sm">
              <div className="flex-1">{fmt(k.start)}</div>
              <span className={`tag ${cls}`}>{label}</span>
              {k.refund > 0 && <span className="font-semibold text-leaf">+{L.taka(k.refund, lang)}</span>}
            </div>
          );
        })}
      </div>

      <div id="flag" className="mt-8">
        <FlagForm classes={past.filter((k) => k.outcome === "COMPLETED").map((k) => ({ id: k.id, label: fmt(k.start) }))} />
      </div>

      <div className="mt-8 flex gap-3 text-sm">
        <button className="btn-ghost">{c.renew}</button>
        <button className="btn-ghost text-redpen!">{c.stop}</button>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-2">{k}</div>
      <div className="mt-1 text-2xl font-bold">{v}</div>
    </div>
  );
}
