import Link from "next/link";
import { findAccounts, rolesOf } from "@/lib/admin/people";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { PageHead, Pill, SearchBox, Table, Td, tx } from "../ui";

export const dynamic = "force-dynamic";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; p?: string }> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = tx(lang);
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 100);
  const page = Math.max(0, Number(sp.p) || 0);
  const { rows, total } = await findAccounts(q, page);
  const roles = await rolesOf(rows);
  const more = (page + 1) * 50 < total;
  return (
    <div>
      <PageHead title={t("মানুষজন", "People")} sub={t(`মোট ${L.count(total, lang)} জন। ইমেইলের যেকোনো অংশ লিখে খুঁজুন।`, `${L.count(total, lang)} accounts. Search by any part of the email.`)} />
      <SearchBox action="/admin/users" q={q} placeholder={t("ইমেইল বা আইডি…", "Email or id…")} />
      <div className="mt-4">
        <Table head={[t("ইমেইল", "Email"), t("কে", "Role"), t("যোগ দিয়েছে", "Joined"), t("শেষ লগইন", "Last sign-in")]} empty={!rows.length && t("কাউকে পাওয়া গেল না", "Nobody found")}>
          {rows.map((r) => {
            const ro = roles.get(r.id);
            return (
              <tr key={r.id}>
                <Td><Link href={`/admin/users/${r.id}`} className="font-medium underline">{r.email}</Link></Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {ro?.admin && <Pill tone="info">{t("অ্যাডমিন", "Admin")}</Pill>}
                    {ro?.tutor && <Pill tone={ro.verified ? "ok" : "warn"}>{t("টিউটর", "Tutor")}{ro.verified ? " ✓" : ""}</Pill>}
                    {ro?.student && <Pill>{t("ছাত্র", "Student")}</Pill>}
                    {ro?.parent && <Pill>{t("অভিভাবক", "Parent")}</Pill>}
                    {ro?.blocked && <Pill tone="bad">{t("সাসপেন্ড", "Suspended")}</Pill>}
                  </div>
                </Td>
                <Td className="text-ink-3">{L.dateTime(new Date(r.created_at), lang)}</Td>
                <Td className="text-ink-3">{r.last_sign_in_at ? L.dateTime(new Date(r.last_sign_in_at), lang) : "—"}</Td>
              </tr>
            );
          })}
        </Table>
      </div>
      <div className="mt-4 flex gap-3 text-sm">
        {page > 0 && <Link className="underline" href={`/admin/users?q=${encodeURIComponent(q)}&p=${page - 1}`}>{t("← আগের পাতা", "← Previous")}</Link>}
        {more && <Link className="underline" href={`/admin/users?q=${encodeURIComponent(q)}&p=${page + 1}`}>{t("পরের পাতা →", "Next →")}</Link>}
      </div>
    </div>
  );
}
