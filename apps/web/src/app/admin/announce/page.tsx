import { db } from "@/lib/data";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { announce } from "../actions";
import { Confirm } from "../Confirm";
import { input, PageHead, Section, Table, Td, tx } from "../ui";

export const dynamic = "force-dynamic";

export default async function AdminAnnounce() {
  const lang = await getLang();
  const t = tx(lang);
  const { data: past } = await db().from("admin_log").select("*").eq("action", "ANNOUNCE").order("created_at", { ascending: false }).limit(30);
  return (
    <div>
      <PageHead title={t("ঘোষণা", "Announce")} sub={t("একসাথে সবার ফোনে/অ্যাপে নোটিফিকেশন। সাইটের মাথায় ব্যানার দিতে চাইলে সেটিংসে যান।", "One notification to many people at once. For a banner on top of the site, use Settings.")} />
      <form action={announce} className="card mt-6 grid max-w-2xl gap-3 p-4 text-sm">
        <label className="grid gap-1"><span className="text-xs text-ink-3">{t("কাদের কাছে", "To whom")}</span>
          <select name="audience" className={input} defaultValue="all">
            <option value="all">{t("সবাই (সব অ্যাকাউন্ট)", "Everyone (all accounts)")}</option>
            <option value="students">{t("ছাত্রছাত্রী", "Students")}</option>
            <option value="tutors">{t("সব টিউটর", "All tutors")}</option>
            <option value="unverified">{t("যাচাই বাকি এমন টিউটর", "Unverified tutors")}</option>
            <option value="parents">{t("অভিভাবক", "Parents")}</option>
          </select>
        </label>
        <label className="grid gap-1"><span className="text-xs text-ink-3">{t("শিরোনাম", "Title")}</span><input name="title" required maxLength={120} className={input} placeholder={t("যেমন: ঈদের ছুটিতে ক্লাস বন্ধ ২ দিন", "e.g. Classes off for 2 days for Eid")} /></label>
        <label className="grid gap-1"><span className="text-xs text-ink-3">{t("বিস্তারিত", "Details")}</span><textarea name="body" rows={3} maxLength={1000} className={input} /></label>
        <label className="grid gap-1"><span className="text-xs text-ink-3">{t("ট্যাপ করলে কোথায় যাবে (ঐচ্ছিক)", "Opens on tap (optional)")}</span><input name="path" className={input} placeholder="/learn" /></label>
        <Confirm ask={t("সবার কাছে পাঠাবেন? এটা ফেরত নেওয়া যায় না।", "Send to everyone selected? This cannot be undone.")} className="btn-gold w-fit px-5! py-2!">{t("পাঠিয়ে দিন", "Send it")}</Confirm>
      </form>
      <Section title={t("আগের ঘোষণা", "Past announcements")}>
        <Table head={[t("কখন", "When"), t("কে", "By"), t("কাদের", "To"), t("শিরোনাম", "Title"), t("কতজন", "Sent")]} empty={!(past ?? []).length && t("এখনো কিছু পাঠানো হয়নি", "Nothing sent yet")}>
          {(past ?? []).map((r) => {
            const d = (r.detail ?? {}) as { title?: string; sent?: number };
            return <tr key={r.id}><Td className="text-ink-3">{L.dateTime(new Date(r.created_at), lang)}</Td><Td>{r.admin_email}</Td><Td>{r.target}</Td><Td>{d.title}</Td><Td>{L.count(d.sent ?? 0, lang)}</Td></tr>;
          })}
        </Table>
      </Section>
    </div>
  );
}
