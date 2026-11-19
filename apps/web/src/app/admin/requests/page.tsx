import Link from "next/link";
import { db } from "@/lib/data";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { removeBid, setRequestStatus } from "../actions";
import { Confirm } from "../Confirm";
import { dangerBtn, ghostBtn, PageHead, Pill, statusTone, Tabs, tx } from "../ui";

export const dynamic = "force-dynamic";

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = tx(lang);
  const tab = ["MATCHED", "CLOSED", "ALL"].includes(sp.tab ?? "") ? sp.tab! : "OPEN";
  let q = db().from("tuition_requests").select("*, request_bids(id,teacher_id,teacher_name,teacher_email,price,message,status,created_at)").order("created_at", { ascending: false }).limit(100);
  if (tab !== "ALL") q = q.eq("status", tab);
  const { data } = await q;
  const rows = data ?? [];
  return (
    <div>
      <PageHead title={t("টিউশন খোঁজ", "Tuition requests")} sub={t("ছাত্ররা যে টিউটর খুঁজছে, আর টিউটরদের দর-কষাকষি।", "What students are looking for, and the tutors' offers.")} />
      <Tabs base="/admin/requests" active={tab} tabs={[["OPEN", t("খোলা", "Open")], ["MATCHED", t("মিলে গেছে", "Matched")], ["CLOSED", t("বন্ধ", "Closed")], ["ALL", t("সব", "All")]]} />
      <div className="mt-4 grid gap-3">
        {rows.length === 0 && <p className="text-sm text-ink-3">{t("এখানে কিছু নেই", "Nothing here")}</p>}
        {rows.map((r) => {
          const bids = (r.request_bids ?? []) as { id: string; teacher_id: string; teacher_name: string | null; teacher_email: string; price: number; message: string | null; status: string }[];
          return (
            <details key={r.id} className="card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                <b>{L.subject(r.subject, lang)}</b>
                <span className="text-ink-2">{r.level} · {r.mode === "HOME" ? `${t("বাসায়", "Home")} · ${r.area ?? ""}` : t("অনলাইন", "Online")} · {L.taka(r.budget, lang)} · {r.days_per_week}{t(" দিন", "d/wk")}</span>
                <span className="text-ink-3">· {r.student_name ?? r.student_email} · {L.dateTime(new Date(r.created_at), lang)}</span>
                <Pill tone={statusTone(r.status)}>{r.status}</Pill>
                <span className="ml-auto text-ink-3">{L.count(bids.length, lang)} {t("অফার", "offers")}</span>
              </summary>
              <div className="mt-3 text-sm">
                {r.note && <p className="text-ink-2">“{r.note}”</p>}
                <div className="mt-2 flex gap-2">
                  {r.status === "OPEN"
                    ? <form action={setRequestStatus.bind(null, r.id, "CLOSED")}><Confirm ask={t("রিকোয়েস্টটা বন্ধ করবেন?", "Close this request?")} className={dangerBtn}>{t("বন্ধ করুন", "Close")}</Confirm></form>
                    : <form action={setRequestStatus.bind(null, r.id, "OPEN")}><button className={ghostBtn}>{t("আবার খুলুন (১৪ দিন)", "Reopen (14 days)")}</button></form>}
                </div>
                <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                  {bids.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <Link href={`/admin/users/${b.teacher_id}`} className="underline">{b.teacher_name ?? b.teacher_email}</Link>
                      <span>{L.taka(b.price, lang)}</span>
                      <Pill tone={statusTone(b.status)}>{b.status}</Pill>
                      {b.message && <span className="text-ink-3">“{b.message}”</span>}
                      {b.status === "PENDING" && <form action={removeBid.bind(null, b.id)} className="ml-auto"><button className="text-xs text-redpen underline">{t("অফার সরান", "Remove offer")}</button></form>}
                    </li>
                  ))}
                  {bids.length === 0 && <li className="px-3 py-2 text-ink-3">{t("এখনো কেউ অফার দেয়নি", "No offers yet")}</li>}
                </ul>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
