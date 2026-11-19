import Link from "next/link";
import { SEGMENT_LABEL, type ContentSegment } from "@mastermoshai/core";
import { db } from "@/lib/data";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { cancelSubscription, extendSubscription, saveCoupon, setCouponActive, setPackageActive } from "../actions";
import { Confirm } from "../Confirm";
import { dangerBtn, ghostBtn, input, PageHead, Pill, SearchBox, smallBtn, Stat, statusTone, Table, Tabs, Td, tx } from "../ui";

export const dynamic = "force-dynamic";
type Lang = "bn" | "en";
const clean = (q: string) => q.replace(/[,()%"]/g, "");

export default async function AdminMoney({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; st?: string }> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = tx(lang);
  const tab = ["subs", "content", "packages", "coupons", "credits"].includes(sp.tab ?? "") ? sp.tab! : "payments";
  const q = clean((sp.q ?? "").trim().toLowerCase().slice(0, 80));
  return (
    <div>
      <PageHead title={t("টাকাপয়সা", "Money")} sub={t("কে কত দিল, কোন প্যাকেজ চলছে, কুপন আর ক্রেডিট। টিউটরদের টাকা তোলা আছে পেআউট পাতায়।", "Who paid what, which packages run, coupons and credit. Tutor withdrawals are on the Payouts page.")} />
      <Tabs base="/admin/money" active={tab} tabs={[["payments", t("পেমেন্ট", "Payments")], ["subs", t("টিউশন প্যাকেজ", "Tuition packages")], ["content", t("কনটেন্ট প্যাক", "Content packs")], ["packages", t("টিউটরের প্যাকেজ তালিকা", "Tutor package list")], ["coupons", t("কুপন", "Coupons")], ["credits", t("ক্রেডিট ও রেফারেল", "Credit & referrals")]]} />
      {tab === "payments" && <Payments lang={lang} q={q} st={sp.st ?? ""} />}
      {tab === "subs" && <Subs lang={lang} q={q} />}
      {tab === "content" && <ContentSubs lang={lang} q={q} />}
      {tab === "packages" && <Packages lang={lang} />}
      {tab === "coupons" && <Coupons lang={lang} />}
      {tab === "credits" && <Credits lang={lang} />}
    </div>
  );
}

async function Payments({ lang, q, st }: { lang: Lang; q: string; st: string }) {
  const t = tx(lang);
  let query = db().from("payments").select("*").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.ilike("payer_email", `%${q}%`);
  if (["PAID", "CREATED", "FAILED", "CANCELLED"].includes(st)) query = query.eq("status", st);
  const { data } = await query;
  const rows = data ?? [];
  const paid = rows.filter((r) => r.status === "PAID");
  const total = paid.reduce((a, r) => a + r.amount, 0);
  return (
    <>
      <SearchBox action="/admin/money" q={q} placeholder={t("কে দিয়েছে (ইমেইল)…", "Payer email…")}>
        <input type="hidden" name="tab" value="payments" />
        <select name="st" defaultValue={st} className="rounded-lg border border-line px-2 text-sm">
          <option value="">{t("সব অবস্থা", "Any status")}</option>
          {["PAID", "CREATED", "FAILED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </SearchBox>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={t("এই তালিকায় জমা", "Paid in this list")} value={L.taka(total, lang)} />
        <Stat label={t("পেমেন্ট সংখ্যা", "Payments")} value={L.count(paid.length, lang)} />
        <Stat label={t("কুপন + ক্রেডিটে ছাড়", "Coupon + credit discounts")} value={L.taka(paid.reduce((a, r) => a + r.discount + r.credit_used, 0), lang)} />
      </div>
      <div className="mt-4">
        <Table head={[t("কখন", "When"), t("কে", "Payer"), t("কীসের", "For"), "৳", t("অবস্থা", "Status"), "bKash TrxID"]} empty={!rows.length && t("কিছু নেই", "Nothing")}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="text-ink-3">{L.dateTime(new Date(r.created_at), lang)}</Td>
              <Td>{r.payer_email}</Td>
              <Td>{r.purpose}{r.coupon_code ? <span className="text-ink-3"> · {r.coupon_code}</span> : null}</Td>
              <Td>{L.taka(r.amount, lang)}{r.amount !== r.list_price ? <span className="text-ink-3"> / {L.taka(r.list_price, lang)}</span> : null}</Td>
              <Td><Pill tone={statusTone(r.status)}>{r.status}</Pill>{r.refunded_at ? <Pill tone="bad">REFUNDED</Pill> : null}</Td>
              <Td className="font-mono text-xs">{r.trx_id ?? ""}</Td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}

function SubActions({ lang, table, id, status }: { lang: Lang; table: "subscriptions" | "content_subscriptions"; id: string; status: string }) {
  const t = tx(lang);
  return (
    <div className="flex flex-wrap gap-1">
      <form action={extendSubscription.bind(null, table, id)} className="flex gap-1">
        <input name="days" type="number" min={1} max={365} placeholder={t("দিন", "days")} className={`${input} w-16`} />
        <button className={ghostBtn}>{t("মেয়াদ বাড়ান", "Extend")}</button>
      </form>
      {status !== "CANCELLED" && <form action={cancelSubscription.bind(null, table, id)}><Confirm ask={t("প্যাকেজটা বাতিল করবেন? অটো-রিনিউও বন্ধ হবে।", "Cancel this package? Auto-renew stops too.")} className={dangerBtn}>{t("বাতিল", "Cancel")}</Confirm></form>}
    </div>
  );
}

async function Subs({ lang, q }: { lang: Lang; q: string }) {
  const t = tx(lang);
  let query = db().from("subscriptions").select("*, packages(title,teacher_name,price)").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`student_email.ilike.%${q}%,payer_email.ilike.%${q}%`);
  const { data } = await query;
  return (
    <>
      <SearchBox action="/admin/money" q={q} placeholder={t("ছাত্র বা যে টাকা দেয়…", "Student or payer…")}><input type="hidden" name="tab" value="subs" /></SearchBox>
      <div className="mt-4">
        <Table head={[t("ছাত্র", "Student"), t("প্যাকেজ", "Package"), t("অবস্থা", "Status"), t("মেয়াদ", "Until"), ""]} empty={!(data ?? []).length && t("কিছু নেই", "Nothing")}>
          {(data ?? []).map((r) => {
            const p = r.packages as unknown as { title: string; teacher_name: string | null; price: number } | null;
            return (
              <tr key={r.id}>
                <Td>{r.student_email}{r.payer_email !== r.student_email ? <div className="text-xs text-ink-3">{t("দেন", "paid by")} {r.payer_email}</div> : null}</Td>
                <Td>{p?.title}<div className="text-xs text-ink-3">{p?.teacher_name} · {p ? L.taka(p.price, lang) : ""} {r.auto_renew ? "· auto" : ""}</div></Td>
                <Td><Pill tone={statusTone(r.status)}>{r.status}</Pill></Td>
                <Td className="text-ink-3">{r.current_period_end ? L.date(new Date(r.current_period_end), lang) : "—"}</Td>
                <Td><SubActions lang={lang} table="subscriptions" id={r.id} status={r.status} /></Td>
              </tr>
            );
          })}
        </Table>
      </div>
    </>
  );
}

async function ContentSubs({ lang, q }: { lang: Lang; q: string }) {
  const t = tx(lang);
  let query = db().from("content_subscriptions").select("*").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`student_email.ilike.%${q}%,payer_email.ilike.%${q}%`);
  const { data } = await query;
  return (
    <>
      <SearchBox action="/admin/money" q={q} placeholder={t("ছাত্র বা যে টাকা দেয়…", "Student or payer…")}><input type="hidden" name="tab" value="content" /></SearchBox>
      <div className="mt-4">
        <Table head={[t("ছাত্র", "Student"), t("প্যাক", "Pack"), t("অবস্থা", "Status"), t("মেয়াদ", "Until"), ""]} empty={!(data ?? []).length && t("কিছু নেই", "Nothing")}>
          {(data ?? []).map((r) => (
            <tr key={r.id}>
              <Td>{r.student_email}</Td>
              <Td>{SEGMENT_LABEL[r.segment as ContentSegment]?.[lang] ?? r.segment}<div className="text-xs text-ink-3">{L.taka(r.price, lang)}</div></Td>
              <Td><Pill tone={statusTone(r.status)}>{r.status}</Pill></Td>
              <Td className="text-ink-3">{r.current_period_end ? L.date(new Date(r.current_period_end), lang) : "—"}</Td>
              <Td><SubActions lang={lang} table="content_subscriptions" id={r.id} status={r.status} /></Td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}

async function Packages({ lang }: { lang: Lang }) {
  const t = tx(lang);
  const { data } = await db().from("packages").select("*").order("created_at", { ascending: false }).limit(300);
  return (
    <div className="mt-4">
      <Table head={[t("প্যাকেজ", "Package"), t("টিউটর", "Tutor"), t("দাম", "Price"), t("অবস্থা", "Status"), ""]} empty={!(data ?? []).length && t("কোনো প্যাকেজ নেই", "No packages")}>
        {(data ?? []).map((p) => (
          <tr key={p.id}>
            <Td>{p.title}<div className="text-xs text-ink-3">{L.subject(p.subject, lang)} · {p.days_per_week}{t(" দিন/সপ্তাহ", "d/wk")} · {p.classes_per_month} {t("ক্লাস", "classes")} · {p.billing}</div></Td>
            <Td><Link href={`/admin/users/${p.teacher_id}`} className="underline">{p.teacher_name ?? p.teacher_email}</Link></Td>
            <Td>{L.taka(p.price, lang)}</Td>
            <Td>{p.active ? <Pill tone="ok">{t("চালু", "On")}</Pill> : <Pill tone="bad">{t("বন্ধ", "Off")}</Pill>}</Td>
            <Td><form action={setPackageActive.bind(null, p.id, !p.active)}><button className={p.active ? dangerBtn : ghostBtn}>{p.active ? t("বন্ধ করুন", "Turn off") : t("চালু করুন", "Turn on")}</button></form></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

async function Coupons({ lang }: { lang: Lang }) {
  const t = tx(lang);
  const { data } = await db().from("coupons").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <form action={saveCoupon} className="card mt-4 flex flex-wrap items-end gap-2 p-4 text-sm">
        <label className="grid gap-1"><span className="text-xs text-ink-3">{t("কোড", "Code")}</span><input name="code" required placeholder="EID50" className={`${input} w-32 uppercase`} /></label>
        <label className="grid gap-1"><span className="text-xs text-ink-3">{t("% ছাড়", "% off")}</span><input name="percent" type="number" min={1} max={100} className={`${input} w-20`} /></label>
        <label className="grid gap-1"><span className="text-xs text-ink-3">{t("অথবা ৳ ছাড়", "or ৳ off")}</span><input name="amount" type="number" min={1} className={`${input} w-24`} /></label>
        <label className="grid gap-1"><span className="text-xs text-ink-3">{t("কতবার চলবে", "Max uses")}</span><input name="max" type="number" min={1} className={`${input} w-24`} /></label>
        <label className="grid gap-1"><span className="text-xs text-ink-3">{t("শেষ তারিখ", "Expires")}</span><input name="expires" type="date" className={input} /></label>
        <button className={smallBtn}>{t("কুপন বানান", "Create coupon")}</button>
      </form>
      <div className="mt-4">
        <Table head={[t("কোড", "Code"), t("ছাড়", "Off"), t("ব্যবহার", "Used"), t("শেষ", "Expires"), ""]} empty={!(data ?? []).length && t("কোনো কুপন নেই", "No coupons")}>
          {(data ?? []).map((c) => (
            <tr key={c.code}>
              <Td className="font-mono font-bold">{c.code}</Td>
              <Td>{c.percent_off ? `${c.percent_off}%` : L.taka(c.amount_off, lang)}</Td>
              <Td>{c.used}{c.max_uses ? ` / ${c.max_uses}` : ""}</Td>
              <Td className="text-ink-3">{c.expires_at ? L.date(new Date(c.expires_at), lang) : "—"}</Td>
              <Td><form action={setCouponActive.bind(null, c.code, !c.active)}><button className={c.active ? dangerBtn : ghostBtn}>{c.active ? t("বন্ধ", "Turn off") : t("চালু", "Turn on")}</button></form></Td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}

async function Credits({ lang }: { lang: Lang }) {
  const t = tx(lang);
  const [{ data: credits }, { data: refs }] = await Promise.all([
    db().from("credits").select("*").order("created_at", { ascending: false }).limit(100),
    db().from("referrals").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="mt-4">
        <h3 className="mb-2 font-semibold">{t("ক্রেডিটের খাতা", "Credit ledger")}</h3>
        <p className="mb-2 text-xs text-ink-3">{t("কাউকে ক্রেডিট দিতে তার প্রোফাইলে যান (মানুষজন পাতা)।", "To give someone credit, open their profile (People page).")}</p>
        <Table head={[t("কখন", "When"), t("কার", "Who"), "৳", t("কেন", "Why")]} empty={!(credits ?? []).length && t("কিছু নেই", "Nothing")}>
          {(credits ?? []).map((c) => <tr key={c.id}><Td className="text-ink-3">{L.date(new Date(c.created_at), lang)}</Td><Td>{c.email}</Td><Td className={c.amount < 0 ? "text-redpen" : ""}>{L.taka(c.amount, lang)}</Td><Td>{c.reason}{c.ref ? <span className="text-ink-3"> · {c.ref}</span> : null}</Td></tr>)}
        </Table>
      </div>
      <div className="mt-4">
        <h3 className="mb-2 font-semibold">{t("রেফারেল", "Referrals")}</h3>
        <p className="mb-2 text-xs text-ink-3">&nbsp;</p>
        <Table head={[t("কে আনল", "Referrer"), t("কাকে", "Friend"), t("অবস্থা", "Status")]} empty={!(refs ?? []).length && t("কিছু নেই", "Nothing")}>
          {(refs ?? []).map((r) => <tr key={r.referee_email}><Td>{r.referrer_email}</Td><Td>{r.referee_email}</Td><Td><Pill tone={r.status === "REWARDED" ? "ok" : "warn"}>{r.status}</Pill></Td></tr>)}
        </Table>
      </div>
    </div>
  );
}
