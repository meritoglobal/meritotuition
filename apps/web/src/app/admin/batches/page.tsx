import Link from "next/link";
import { db } from "@/lib/data";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { addToBatch, decideChange, holdSession, removeFromBatch, setBatchActive } from "../actions";
import { forceRelease } from "../payouts/actions";
import { Confirm } from "../Confirm";
import { dangerBtn, ghostBtn, input, PageHead, Pill, SearchBox, smallBtn, statusTone, Table, Tabs, Td, tx } from "../ui";

export const dynamic = "force-dynamic";

const WD_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
const WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AdminBatches({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = tx(lang);
  const tab = sp.tab === "sessions" || sp.tab === "changes" ? sp.tab : "batches";
  return (
    <div>
      <PageHead title={t("ব্যাচ ও ক্লাস", "Batches & classes")} sub={t("কোন ব্যাচে কে পড়ে, কোন ক্লাস হলো, আর রুটিন বদলের ঝগড়া মেটানো।", "Who is in which batch, which classes ran, and settling routine changes.")} />
      <Tabs base="/admin/batches" active={tab} tabs={[["batches", t("ব্যাচ", "Batches")], ["sessions", t("ক্লাসের খাতা", "Class log")], ["changes", t("রুটিন বদল", "Routine changes")]]} />
      {tab === "batches" && <Batches lang={lang} q={(sp.q ?? "").trim().slice(0, 80)} />}
      {tab === "sessions" && <Sessions lang={lang} />}
      {tab === "changes" && <Changes lang={lang} />}
    </div>
  );
}

async function Batches({ lang, q }: { lang: "bn" | "en"; q: string }) {
  const t = tx(lang);
  let query = db().from("batches").select("*, batch_students(email,name)").order("created_at", { ascending: false }).limit(100);
  if (q) query = query.ilike("title", `%${q.replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  const rows = (data ?? []) as { id: string; teacher_id: string; title: string; subject: string; level: string; mode: string; capacity: number; fee: number | null; schedule: { day: number; time: string; minutes: number }[]; class_id: string; active: boolean; batch_students: { email: string; name: string | null }[] }[];
  const tids = [...new Set(rows.map((r) => r.teacher_id))];
  const { data: tp } = tids.length ? await db().from("teacher_profiles").select("user_id,name").in("user_id", tids) : { data: [] };
  const tname = new Map((tp ?? []).map((x) => [x.user_id, x.name]));
  const wd = lang === "en" ? WD_EN : WD_BN;
  return (
    <>
      <SearchBox action="/admin/batches" q={q} placeholder={t("ব্যাচের নাম…", "Batch name…")} />
      <div className="mt-4 grid gap-3">
        {rows.length === 0 && <p className="text-sm text-ink-3">{t("কোনো ব্যাচ নেই", "No batches")}</p>}
        {rows.map((b) => (
          <details key={b.id} className="card p-4">
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
              <b className="text-base">{b.title}</b>
              <span className="text-ink-2">{L.subject(b.subject, lang)} · {b.mode} · {b.batch_students.length}/{b.capacity}</span>
              <span className="text-ink-3">· {t("টিচার", "Tutor")}: <Link href={`/admin/users/${b.teacher_id}`} className="underline">{tname.get(b.teacher_id) ?? b.teacher_id}</Link></span>
              {!b.active && <Pill tone="bad">{t("বন্ধ", "Off")}</Pill>}
            </summary>
            <div className="mt-3 text-sm">
              <p className="text-ink-2">{t("রুটিন", "Routine")}: {(b.schedule ?? []).map((s) => `${wd[s.day] ?? s.day} ${L.time(s.time, lang)} (${s.minutes}m)`).join(", ") || "—"} {b.fee ? `· ${L.taka(b.fee, lang)}` : ""}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <form action={setBatchActive.bind(null, b.id, !b.active)}>
                  {b.active
                    ? <Confirm ask={t("ব্যাচটা বন্ধ করবেন?", "Turn this batch off?")} className={dangerBtn}>{t("ব্যাচ বন্ধ", "Turn off")}</Confirm>
                    : <button className={ghostBtn}>{t("আবার চালু", "Turn on")}</button>}
                </form>
              </div>
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                {b.batch_students.map((s) => (
                  <li key={s.email} className="flex items-center gap-2 px-3 py-2">
                    <span>{s.name ? `${s.name} · ` : ""}{s.email}</span>
                    <form action={removeFromBatch.bind(null, b.id, s.email)} className="ml-auto">
                      <Confirm ask={t("এই ছাত্রকে ব্যাচ থেকে বাদ দেবেন?", "Remove this student from the batch?")} className="text-xs text-redpen underline">{t("বাদ দিন", "Remove")}</Confirm>
                    </form>
                  </li>
                ))}
                {b.batch_students.length === 0 && <li className="px-3 py-2 text-ink-3">{t("এখনো কেউ নেই", "Nobody yet")}</li>}
              </ul>
              <form action={addToBatch.bind(null, b.id)} className="mt-2 flex flex-wrap gap-2">
                <input name="email" type="email" required placeholder={t("ছাত্রের ইমেইল", "Student email")} className={`${input} flex-1`} />
                <input name="name" placeholder={t("নাম", "Name")} className={input} />
                <button className={smallBtn}>{t("যোগ করুন", "Add")}</button>
              </form>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}

async function Sessions({ lang }: { lang: "bn" | "en" }) {
  const t = tx(lang);
  const { data } = await db().from("class_sessions").select("*").order("started_at", { ascending: false }).limit(150);
  const rows = data ?? [];
  const bids = [...new Set(rows.map((r) => r.batch_id).filter(Boolean))];
  const { data: bs } = bids.length ? await db().from("batches").select("id,title").in("id", bids) : { data: [] };
  const title = new Map((bs ?? []).map((b) => [b.id, b.title]));
  return (
    <div className="mt-4">
      <p className="mb-3 text-sm text-ink-2">{t("টিচার রুম খুলে অন্তত একজন ছাত্র এলে ক্লাস 'হয়েছে' ধরা হয়, তখন টাকা টিচারের ওয়ালেটে যায়। ফাঁকা গেলে টাকা আটকে থাকে, চাইলে এখান থেকে ছেড়ে দিন বা আটকে রাখুন।", "A class counts once the tutor opened the room and at least one student joined; then money moves to the tutor's wallet. Empty classes hold the money; release or hold it here.")}</p>
      <Table head={[t("কবে", "When"), t("ব্যাচ", "Batch"), t("ছাত্র", "Students"), t("দেরি", "Late"), t("অবস্থা", "Status"), ""]} empty={!rows.length && t("এখনো কোনো ক্লাস হয়নি", "No classes yet")}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="text-ink-3">{L.dateTime(new Date(r.started_at), lang)}</Td>
            <Td>{title.get(r.batch_id) ?? r.class_id}</Td>
            <Td>{r.students ?? "—"}</Td>
            <Td className={r.late_min >= 15 ? "text-redpen" : ""}>{r.late_min ? `${r.late_min}m` : "—"}</Td>
            <Td><Pill tone={statusTone(r.status)}>{r.status}</Pill></Td>
            <Td><div className="flex gap-1">
              {r.status === "EMPTY" && <form action={forceRelease.bind(null, r.id)}><button className={ghostBtn}>{t("টাকা ছাড়ুন", "Release")}</button></form>}
              {(r.status === "OPEN" || r.status === "EMPTY") && <form action={holdSession.bind(null, r.id)}><Confirm ask={t("এই ক্লাসের টাকা আটকে রাখবেন?", "Hold this class's money?")} className={dangerBtn}>{t("আটকান", "Hold")}</Confirm></form>}
            </div></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

async function Changes({ lang }: { lang: "bn" | "en" }) {
  const t = tx(lang);
  const { data } = await db().from("schedule_changes").select("*, schedule_votes(email,vote), batches(title)").order("created_at", { ascending: false }).limit(100);
  const rows = data ?? [];
  return (
    <div className="mt-4">
      <p className="mb-3 text-sm text-ink-2">{t("নিয়ম: রুটিন বদলাতে ব্যাচের সব ছাত্রকে রাজি হতে হয়। কেউ সাড়া না দিলে এখান থেকে আপনি সিদ্ধান্ত দিতে পারেন।", "Rule: every student in the batch must agree. If someone never answers, you can decide here.")}</p>
      <Table head={[t("ব্যাচ", "Batch"), t("কী বদল", "Change"), t("ভোট", "Votes"), t("অবস্থা", "Status"), ""]} empty={!rows.length && t("কোনো প্রস্তাব নেই", "No proposals")}>
        {rows.map((c) => {
          const votes = (c.schedule_votes ?? []) as { email: string; vote: string }[];
          const b = c.batches as unknown as { title: string } | null;
          return (
            <tr key={c.id}>
              <Td>{b?.title ?? c.batch_id}<div className="text-xs text-ink-3">{L.dateTime(new Date(c.created_at), lang)}</div></Td>
              <Td>{c.kind === "RESCHEDULE" && c.from_at && c.to_at ? `${L.dateTime(new Date(c.from_at), lang)} → ${L.dateTime(new Date(c.to_at), lang)}` : t("নতুন সাপ্তাহিক রুটিন", "New weekly routine")}{c.note ? <div className="text-xs text-ink-3">{c.note}</div> : null}</Td>
              <Td>{votes.filter((v) => v.vote === "APPROVE").length}/{(c.required ?? []).length} ✓{votes.some((v) => v.vote === "REJECT") ? " · ✗" : ""}</Td>
              <Td><Pill tone={statusTone(c.status)}>{c.status}</Pill></Td>
              <Td>{c.status === "PENDING" && <div className="flex gap-1">
                <form action={decideChange.bind(null, c.id, true)}><button className={smallBtn}>{t("পাস", "Approve")}</button></form>
                <form action={decideChange.bind(null, c.id, false)}><button className={dangerBtn}>{t("বাতিল", "Reject")}</button></form>
              </div>}</Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
