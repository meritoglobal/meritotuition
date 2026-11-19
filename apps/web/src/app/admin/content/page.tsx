import Link from "next/link";
import { CONTENT } from "@/lib/content-catalog";
import { db } from "@/lib/data";
import { imageUrl, type Doubt } from "@/lib/growth/ask";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { answerDoubt, deleteTest, reopenDoubt, setTestPublished } from "../actions";
import { Confirm } from "../Confirm";
import { dangerBtn, ghostBtn, input, PageHead, Pill, smallBtn, statusTone, Table, Tabs, Td, tx } from "../ui";

export const dynamic = "force-dynamic";
type Lang = "bn" | "en";

export default async function AdminContent({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = tx(lang);
  const tab = sp.tab === "doubts" || sp.tab === "library" ? sp.tab : "tests";
  return (
    <div>
      <PageHead title={t("কনটেন্ট ও পরীক্ষা", "Content & tests")} sub={t("মডেল টেস্ট, ছবি-প্রশ্নের উত্তর আর লেকচার শিটের তালিকা।", "Model tests, photo questions and the lecture-sheet list.")} />
      <Tabs base="/admin/content" active={tab} tabs={[["tests", t("মডেল টেস্ট", "Model tests")], ["doubts", t("ছবি-প্রশ্ন", "Photo questions")], ["library", t("লেকচার শিট", "Lecture sheets")]]} />
      {tab === "tests" && <Tests lang={lang} />}
      {tab === "doubts" && <Doubts lang={lang} />}
      {tab === "library" && <Library lang={lang} />}
    </div>
  );
}

async function Tests({ lang }: { lang: Lang }) {
  const t = tx(lang);
  const { data } = await db().from("model_tests").select("id,title,subject,level,price,opens_at,closes_at,published,created_at, model_test_attempts(count)").order("created_at", { ascending: false }).limit(100);
  return (
    <div className="mt-4">
      <p className="mb-3 text-sm text-ink-2">{t("নতুন মডেল টেস্ট বানাতে ", "To make a new model test, open ")}<Link href="/leaderboard" className="underline">{t("মডেল টেস্ট পাতায়", "the model test page")}</Link>{t(" যান, অ্যাডমিন হিসেবে সেখানে বানানোর বাক্স দেখবেন।", "; as an admin you will see the create box there.")}</p>
      <Table head={[t("টেস্ট", "Test"), t("দাম", "Price"), t("কতজন দিয়েছে", "Attempts"), t("অবস্থা", "Status"), ""]} empty={!(data ?? []).length && t("এখনো কোনো টেস্ট নেই", "No tests yet")}>
        {(data ?? []).map((m) => {
          const attempts = (m.model_test_attempts as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <tr key={m.id}>
              <Td><Link href={`/leaderboard/${m.id}`} className="font-medium underline">{m.title}</Link><div className="text-xs text-ink-3">{L.subject(m.subject, lang)} · {m.level} · {L.date(new Date(m.opens_at), lang)}{m.closes_at ? ` → ${L.date(new Date(m.closes_at), lang)}` : ""}</div></Td>
              <Td>{m.price ? L.taka(m.price, lang) : t("ফ্রি", "Free")}</Td>
              <Td>{L.count(attempts, lang)}</Td>
              <Td>{m.published ? <Pill tone="ok">{t("চালু", "Live")}</Pill> : <Pill tone="bad">{t("লুকানো", "Hidden")}</Pill>}</Td>
              <Td><div className="flex gap-1">
                <form action={setTestPublished.bind(null, m.id, !m.published)}><button className={ghostBtn}>{m.published ? t("লুকান", "Hide") : t("চালু করুন", "Publish")}</button></form>
                <form action={deleteTest.bind(null, m.id)}><Confirm ask={t("টেস্ট আর সবার ফলাফল মুছে যাবে। নিশ্চিত?", "This deletes the test and all results. Sure?")} className={dangerBtn}>{t("মুছুন", "Delete")}</Confirm></form>
              </div></Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

async function Doubts({ lang }: { lang: Lang }) {
  const t = tx(lang);
  const { data } = await db().from("doubts").select("*").order("created_at", { ascending: false }).limit(100);
  const rows = data ?? [];
  const imgs = await Promise.all(rows.map((d) => imageUrl(d as Doubt).catch(() => null)));
  return (
    <div className="mt-4 grid gap-3">
      <p className="text-sm text-ink-2">{t("ছাত্র ছবি তুলে প্রশ্ন পাঠায়, আগে AI উত্তর দেয়, না বুঝলে টিউটরের কাছে যায়। কেউ ধরছে না এমন প্রশ্নের উত্তর আপনি নিজেই দিতে পারেন।", "Students send a photo; AI answers first, then a tutor. You can answer ones nobody picked up.")}</p>
      {rows.length === 0 && <p className="text-sm text-ink-3">{t("কোনো প্রশ্ন নেই", "No questions")}</p>}
      {rows.map((d, i) => (
        <details key={d.id} className="card p-4 text-sm" open={d.status === "OPEN"}>
          <summary className="flex cursor-pointer flex-wrap items-center gap-2">
            <b>{L.subject(d.subject, lang)}</b><span className="text-ink-3">{d.level} · {d.asker_email} · {L.dateTime(new Date(d.created_at), lang)}</span>
            <Pill tone={statusTone(d.status)}>{d.status}</Pill>{d.price ? <span className="text-ink-3">{L.taka(d.price, lang)}</span> : null}
          </summary>
          <div className="mt-2 space-y-2">
            {imgs[i] && <img src={imgs[i]!} alt="" className="max-h-72 rounded border border-line" />}
            {d.text && <p>{d.text}</p>}
            {d.ai_answer && <p className="text-ink-2"><b>AI:</b> {d.ai_answer}</p>}
            {d.tutor_answer && <p className="text-ink-2"><b>{d.tutor_name ?? d.tutor_email}:</b> {d.tutor_answer}</p>}
            {(d.status === "OPEN" || d.status === "CLAIMED") && (
              <form action={answerDoubt.bind(null, d.id)} className="grid gap-2">
                <textarea name="answer" required rows={3} placeholder={t("আপনার উত্তর…", "Your answer…")} className={input} />
                <div className="flex gap-2">
                  <button className={smallBtn}>{t("উত্তর পাঠান", "Send answer")}</button>
                  {d.status === "CLAIMED" && <button formAction={reopenDoubt.bind(null, d.id)} formNoValidate className={ghostBtn}>{t("টিউটরের কাছ থেকে ফেরত নিন", "Take back from tutor")}</button>}
                </div>
              </form>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

function Library({ lang }: { lang: Lang }) {
  const t = tx(lang);
  return (
    <div className="mt-4">
      <p className="mb-3 text-sm text-ink-2">{t(`এখন ${L.count(CONTENT.length, lang)}টি লেকচার শিট/স্লাইড আছে। নতুন শিট কোডের সাথে যোগ হয় (কনটেন্ট থ্রেডে বানানো হচ্ছে), তাই এখানে শুধু দেখা যায়। কে কোন প্যাক কিনেছে তা টাকাপয়সা → কনটেন্ট প্যাকে।`, `${CONTENT.length} sheets/slides live. New sheets ship with the code (built in the content thread), so this list is read-only. Who bought which pack is under Money → Content packs.`)}</p>
      <Table head={[t("শিট", "Sheet"), t("বিষয়", "Subject"), t("অধ্যায়", "Chapter"), ""]} empty={!CONTENT.length && t("কিছু নেই", "Nothing")}>
        {CONTENT.map((c) => (
          <tr key={c.id}>
            <Td>{c.title[lang]}<div className="text-xs text-ink-3">{c.kind}</div></Td>
            <Td>{L.subject(c.subject, lang)} · {c.level}</Td>
            <Td>{L.num(c.chapter, lang)}</Td>
            <Td><Link href={c.href} className="underline">{t("খুলুন", "Open")}</Link></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
