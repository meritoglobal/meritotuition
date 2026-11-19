import { OWNER_EMAILS } from "@/lib/admin/core";
import { getSettings } from "@/lib/admin/settings";
import { db } from "@/lib/data";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { addAdmin, removeAdmin, saveNotice, savePrice, saveTiers } from "../actions";
import { Confirm } from "../Confirm";
import { input, PageHead, Pill, Section, smallBtn, Table, Tabs, Td, tx } from "../ui";

export const dynamic = "force-dynamic";
type Lang = "bn" | "en";

export default async function AdminSettings({ searchParams }: { searchParams: Promise<{ tab?: string; a?: string }> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = tx(lang);
  const tab = sp.tab === "admins" || sp.tab === "log" ? sp.tab : "rules";
  return (
    <div>
      <PageHead title={t("সেটিংস ও লগ", "Settings & log")} sub={t("কমিশন, দাম, সাইটের ব্যানার, কে কে অ্যাডমিন, আর কে কী করল তার খাতা।", "Commission, prices, the site banner, who is an admin, and the log of who did what.")} />
      <Tabs base="/admin/settings" active={tab} tabs={[["rules", t("নিয়মকানুন", "Rules")], ["admins", t("অ্যাডমিন", "Admins")], ["log", t("লগ খাতা", "Log")]]} />
      {tab === "rules" && <Rules lang={lang} />}
      {tab === "admins" && <Admins lang={lang} />}
      {tab === "log" && <Log lang={lang} action={(sp.a ?? "").replace(/[^A-Z_]/g, "")} />}
    </div>
  );
}

async function Rules({ lang }: { lang: Lang }) {
  const t = tx(lang);
  const st = await getSettings();
  return (
    <>
      <Section title={t("কমিশনের সিঁড়ি", "Commission ladder")}>
        <p className="mb-3 text-sm text-ink-2">{t("টিউটরের মোট পেয়িং ছাত্র যত বাড়ে, কমিশন তত কমে। বদল সাথে সাথে নতুন ক্লাসের হিসাবে লাগে, আগের টাকায় না।", "As a tutor's paying students grow, commission drops. Changes apply to classes from now on, not past money.")}</p>
        <form action={saveTiers} className="card overflow-x-auto p-4">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs text-ink-3"><tr><th className="py-1">{t("স্তর", "Tier")}</th><th>{t("কমপক্ষে ছাত্র", "Min students")}</th><th>{t("কমিশন %", "Commission %")}</th><th /></tr></thead>
            <tbody>
              {st.tiers.map((x, i) => (
                <tr key={x.code} className="border-t border-line">
                  <td className="py-2 font-semibold">{x.label[lang]}<input type="hidden" name="code" value={x.code} /></td>
                  <td><input name={`min_${x.code}`} type="number" min={0} defaultValue={x.minStudents} disabled={i === 0} className={`${input} w-24`} /></td>
                  <td><input name={`rate_${x.code}`} type="number" min={0} max={50} step={0.5} defaultValue={Math.round(x.rate * 1000) / 10} className={`${input} w-24`} /></td>
                  <td>{x.expertOnly && <Pill tone="info">{t("শুধু এক্সপার্ট ব্যাজে", "Expert badge only")}</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Confirm ask={t("কমিশন বদলাবেন? সব টিউটরের পরের ক্লাস থেকে লাগবে।", "Change commission for every tutor's next classes?")} className={`${smallBtn} mt-3`}>{t("সেভ", "Save")}</Confirm>
        </form>
        <p className="mt-2 text-xs text-ink-3">{t("মনে রাখবেন: হোমপেজ/টিউটর পাতার লেখায় '২০% থেকে ৫%' কথাটা লেখা আছে; বড় বদল করলে সেই লেখাও বদলাতে বলবেন।", "Note: the marketing copy says '20% down to 5%'; ask for a copy update after a big change.")}</p>
      </Section>

      <Section title={t("কনটেন্ট প্যাকের দাম (মাসে)", "Content pack price (monthly)")}>
        <form action={savePrice} className="card flex flex-wrap items-center gap-2 p-4 text-sm">
          <span>৳</span>
          <input name="price" type="number" min={100} max={100000} defaultValue={st.contentPrice} className={`${input} w-32`} />
          <button className={smallBtn}>{t("সেভ", "Save")}</button>
          <span className="text-ink-3">{t("নতুন কেনা আর রিনিউতে লাগবে।", "Applies to new purchases.")}</span>
        </form>
      </Section>

      <Section title={t("সাইটের মাথায় ব্যানার", "Banner on top of the site")}>
        <form action={saveNotice} className="card grid gap-2 p-4 text-sm">
          <input name="bn" defaultValue={st.notice?.bn ?? ""} maxLength={300} placeholder="বাংলায়: যেমন, শুক্রবার রাত ১১টা-১২টা সাইট মেরামত চলবে" className={input} />
          <input name="en" defaultValue={st.notice?.en ?? ""} maxLength={300} placeholder="In English (optional)" className={input} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1"><input type="radio" name="tone" value="info" defaultChecked={st.notice?.tone !== "warn"} /> {t("সাধারণ (সবুজ)", "Normal (green)")}</label>
            <label className="flex items-center gap-1"><input type="radio" name="tone" value="warn" defaultChecked={st.notice?.tone === "warn"} /> {t("জরুরি (লাল)", "Urgent (red)")}</label>
            <button className={smallBtn}>{t("সেভ", "Save")}</button>
            <span className="text-ink-3">{t("দুটো ঘর ফাঁকা রেখে সেভ করলে ব্যানার উঠে যাবে।", "Save both empty to remove the banner.")}</span>
          </div>
        </form>
      </Section>
    </>
  );
}

async function Admins({ lang }: { lang: Lang }) {
  const t = tx(lang);
  const { data, error } = await db().from("admin_users").select("*").order("created_at");
  return (
    <>
      <Section title={t("মালিক (Netlify-র ADMIN_EMAILS)", "Owners (ADMIN_EMAILS in Netlify)")}>
        <p className="text-sm">{OWNER_EMAILS.join(", ") || "—"}</p>
        <p className="mt-1 text-xs text-ink-3">{t("এঁদের এখান থেকে সরানো বা সাসপেন্ড করা যায় না।", "These cannot be removed or suspended from here.")}</p>
      </Section>
      <Section title={t("প্যানেল থেকে যোগ করা অ্যাডমিন", "Admins added here")}>
        {error && <p className="mb-2 text-sm text-redpen">{t("আগে supabase/admin.sql চালান।", "Run supabase/admin.sql first.")}</p>}
        <form action={addAdmin} className="mb-3 flex flex-wrap gap-2 text-sm">
          <input name="email" type="email" required placeholder={t("নতুন অ্যাডমিনের ইমেইল", "New admin's email")} className={`${input} w-72`} />
          <Confirm ask={t("এই মানুষটি সব কিছু কন্ট্রোল করতে পারবে। নিশ্চিত?", "This person will control everything. Sure?")} className={smallBtn}>{t("অ্যাডমিন বানান", "Make admin")}</Confirm>
        </form>
        <Table head={[t("ইমেইল", "Email"), t("কে যোগ করেছেন", "Added by"), ""]} empty={!(data ?? []).length && t("কেউ নেই", "Nobody")}>
          {(data ?? []).map((a) => (
            <tr key={a.email}><Td>{a.email}</Td><Td className="text-ink-3">{a.added_by} · {L.date(new Date(a.created_at), lang)}</Td>
              <Td><form action={removeAdmin.bind(null, a.email)}><Confirm ask={t("অ্যাডমিন থেকে সরাবেন?", "Remove as admin?")} className="text-sm text-redpen underline">{t("সরান", "Remove")}</Confirm></form></Td></tr>
          ))}
        </Table>
      </Section>
    </>
  );
}

async function Log({ lang, action }: { lang: Lang; action: string }) {
  const t = tx(lang);
  let q = db().from("admin_log").select("*").order("created_at", { ascending: false }).limit(300);
  if (action) q = q.eq("action", action);
  const { data } = await q;
  return (
    <div className="mt-4">
      <Table head={[t("কখন", "When"), t("অ্যাডমিন", "Admin"), t("কাজ", "Action"), t("কার উপর", "Target"), t("বিস্তারিত", "Detail")]} empty={!(data ?? []).length && t("খাতা ফাঁকা", "Empty log")}>
        {(data ?? []).map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap text-ink-3">{L.dateTime(new Date(r.created_at), lang)}</Td>
            <Td>{r.admin_email}</Td>
            <Td><a href={`/admin/settings?tab=log&a=${r.action}`} className="underline">{r.action}</a></Td>
            <Td className="break-all">{r.target}</Td>
            <Td className="max-w-xs break-all text-xs text-ink-3">{r.detail ? JSON.stringify(r.detail) : ""}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
