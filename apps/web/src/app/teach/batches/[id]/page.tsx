import { DATA_LIVE } from "@/lib/data";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ClassLevel } from "@mastermoshai/core";
import ClassTools from "@/components/class/ClassTools";
import { getUser } from "@/lib/auth/session";
import { batchStudents, teacherBatch } from "@/lib/batches";
import { contentFor } from "@/lib/content-catalog";
import { toolsCopy } from "@/lib/copy-tools";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { addStudent, removeStudent, setBatchActive } from "../../actions";
import AddStudent from "./AddStudent";

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  if (!DATA_LIVE) return null; // the layout shows the setup note
  const { id } = await params;
  const lang = await getLang();
  const t = toolsCopy(lang).teach;
  const u = (await getUser())!;
  const b = await teacherBatch(id, u.id);
  if (!b) notFound();
  const students = await batchStudents(b.id);
  const content = contentFor(b.subject, b.level);

  return (
    <div>
      <Link href="/teach" className="text-sm text-ink-2">{t.batch.back}</Link>
      <div className="mt-2 flex flex-wrap items-start gap-3">
        <div>
          <h1 className="font-display text-3xl">{b.title}</h1>
          <p className="text-sm text-ink-3">
            {L.subject(b.subject, lang)} · {L.level(b.level as ClassLevel, lang)} · {b.mode === "OFFLINE" ? t.home : t.online} · {t.seats(students.length, b.capacity)}
            {b.fee ? <> · {L.taka(b.fee, lang)}</> : null}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {b.schedule.map((s, i) => <span key={i} className="tag">{L.day(s.day as 0, lang)} {L.time(s.time, lang)} · {L.num(s.minutes, lang)} {t.batchForm.minutes}</span>)}
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          {b.active && <Link href={`/class/${b.class_id}`} className="btn-gold">{t.enter}</Link>}
          <form action={setBatchActive.bind(null, b.id, !b.active)}><button className="btn-ghost text-sm">{b.active ? t.batch.archive : t.batch.unarchive}</button></form>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-3">{t.batch.link}: <code className="select-all rounded bg-mist px-1.5 py-0.5">https://mastermoshai.netlify.app/class/{b.class_id}</code></p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="card p-5">
          <h2 className="font-semibold">{t.batch.students}</h2>
          {students.length === 0 ? <p className="mt-2 text-sm text-ink-3">{t.batch.noStudents}</p> : (
            <ul className="mt-2 divide-y divide-line text-sm">
              {students.map((s) => (
                <li key={s.email} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0 truncate">{s.name ? <><b>{s.name}</b> · </> : null}<span className="text-ink-2">{s.email}</span></span>
                  <form action={removeStudent.bind(null, b.id, s.email)}><button className="text-redpen">{t.batch.remove}</button></form>
                </li>
              ))}
            </ul>
          )}
          <AddStudent action={addStudent.bind(null, b.id)} />

          <h2 className="mt-8 font-semibold">{t.batch.content}</h2>
          {content.length === 0 ? <p className="mt-2 text-sm text-ink-3">{t.batch.noContent}</p> : (
            <ul className="mt-2 space-y-2 text-sm">
              {content.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span><span className="tag mr-1.5">{t.content.kinds[c.kind]}</span>{c.title[lang]}</span>
                  <a href={c.href} target="_blank" rel="noreferrer" className="shrink-0 text-ink-2 underline">{t.batch.download}</a>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="-mt-6"><ClassTools classId={b.class_id} role="teacher" /></div>
      </div>
    </div>
  );
}
