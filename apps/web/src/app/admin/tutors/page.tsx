import Link from "next/link";
import { revalidatePath } from "next/cache";
import { adminOrNull, audit } from "@/lib/admin/core";
import { decide, idImageUrls, type Verification } from "@/lib/biz/verify";
import { bizCopy } from "@/lib/copy-biz";
import { db } from "@/lib/data";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { setTutorFlag } from "../actions";
import { ghostBtn, PageHead, Pill, SearchBox, Table, Tabs, Td, tx } from "../ui";

export const dynamic = "force-dynamic";

async function rule(userId: string, ok: boolean, f: FormData) {
  "use server";
  const m = await adminOrNull();
  if (!m) return;
  const note = String(f.get("note") ?? "").trim().slice(0, 300) || null;
  await decide(userId, ok ? "APPROVED" : "REJECTED", null, note);
  await audit(m.email, ok ? "ID_APPROVE" : "ID_REJECT", userId, { note });
  revalidatePath("/admin", "layout");
}

interface Tutor { user_id: string; email: string | null; name: string; university: string | null; subjects: string[]; verified: boolean; expert: boolean; hidden?: boolean; updated_at: string; price_online: number | null }

export default async function AdminTutors({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; f?: string }> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = tx(lang);
  const c = bizCopy(lang).verify;
  const tab = sp.tab === "all" ? "all" : "queue";
  return (
    <div>
      <PageHead title={t("টিউটর ও আইডি যাচাই", "Tutors & ID check")} sub={t("কার্ড দেখে হ্যাঁ/না বলুন, আর সব টিউটরের ব্যাজ-তালা এখান থেকেই।", "Look at the ID, say yes or no; every tutor's badges and locks live here too.")} />
      <Tabs base="/admin/tutors" active={tab} tabs={[["queue", t("যাচাইয়ের লাইন", "ID queue")], ["all", t("সব টিউটর", "All tutors")]]} />
      {tab === "queue" ? <Queue lang={lang} c={c} /> : <All lang={lang} q={(sp.q ?? "").trim().slice(0, 80)} f={sp.f ?? ""} />}
    </div>
  );
}

async function Queue({ lang, c }: { lang: "bn" | "en"; c: ReturnType<typeof bizCopy>["verify"] }) {
  const { data } = await db().from("tutor_verifications").select("*").in("status", ["REVIEW", "PENDING"]).order("submitted_at").limit(50);
  const list = (data ?? []) as Verification[];
  const imgs = await Promise.all(list.map(idImageUrls));
  return (
    <>
      {list.length === 0 && <p className="mt-4 text-sm text-ink-3">{c.none}</p>}
      <div className="mt-4 grid gap-4">
        {list.map((v, i) => (
          <div key={v.user_id} className="card p-4 text-sm">
            <b>{v.profile_name}</b> · {v.email} · <Link href={`/admin/users/${v.user_id}`} className="underline">{lang === "en" ? "profile" : "প্রোফাইল"}</Link>
            <div className="mt-2 flex flex-wrap gap-2">{imgs[i]!.map((u) => <img key={u} src={u} alt="" className="max-h-56 rounded border border-line" />)}</div>
            {v.ai && <p className="mt-2 text-ink-2">{c.aiSays}: {v.ai.doc_type ?? "?"}{v.ai.school_class ? ` (class ${v.ai.school_class})` : ""} · {v.ai.institution ?? "?"} · {v.ai.name_on_card ?? "?"} · {v.ai.id_number ?? "?"} · {Math.round(v.ai.confidence * 100)}% · {v.ai.reason}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <form action={rule.bind(null, v.user_id, true)}><button className="btn-board px-3! py-1!">{c.approve}</button></form>
              <form action={rule.bind(null, v.user_id, false)} className="flex gap-2">
                <input name="note" placeholder={c.reason} className="rounded border border-line px-2 py-1" />
                <button className="text-redpen underline">{c.reject}</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

async function All({ lang, q, f }: { lang: "bn" | "en"; q: string; f: string }) {
  const t = tx(lang);
  let query = db().from("teacher_profiles").select("user_id,email,name,university,subjects,verified,expert,hidden,updated_at,price_online").order("updated_at", { ascending: false }).limit(200);
  if (q) query = query.or(`name.ilike.%${q.replace(/[,()%]/g, "")}%,email.ilike.%${q.replace(/[,()%]/g, "")}%`);
  if (f === "verified") query = query.eq("verified", true);
  if (f === "unverified") query = query.eq("verified", false);
  if (f === "expert") query = query.eq("expert", true);
  if (f === "hidden") query = query.eq("hidden", true);
  const { data, error } = await query;
  const rows = (data ?? []) as Tutor[];
  return (
    <>
      <SearchBox action="/admin/tutors" q={q} placeholder={t("নাম বা ইমেইল…", "Name or email…")}>
        <input type="hidden" name="tab" value="all" />
        <select name="f" defaultValue={f} className="rounded-lg border border-line px-2 text-sm">
          <option value="">{t("সবাই", "Everyone")}</option>
          <option value="verified">{t("যাচাই হয়েছে", "Verified")}</option>
          <option value="unverified">{t("যাচাই বাকি", "Unverified")}</option>
          <option value="expert">{t("এক্সপার্ট", "Experts")}</option>
          <option value="hidden">{t("লুকানো", "Hidden")}</option>
        </select>
      </SearchBox>
      {error && <p className="mt-3 text-sm text-redpen">{t("admin.sql চালানো হয়নি বলে 'লুকানো' কলাম নেই।", "Run admin.sql: the 'hidden' column is missing.")}</p>}
      <div className="mt-4">
        <Table head={[t("টিউটর", "Tutor"), t("বিষয়", "Subjects"), t("ব্যাজ", "Badges"), t("কন্ট্রোল", "Control")]} empty={!rows.length && t("কেউ নেই", "Nobody")}>
          {rows.map((r) => (
            <tr key={r.user_id}>
              <Td><Link href={`/admin/users/${r.user_id}`} className="font-medium underline">{r.name}</Link><div className="text-xs text-ink-3">{r.email} · {r.university ?? ""}</div></Td>
              <Td className="text-ink-2">{L.subjects(r.subjects ?? [], lang)}{r.price_online ? <div className="text-xs text-ink-3">{L.taka(r.price_online, lang)}</div> : null}</Td>
              <Td><div className="flex flex-wrap gap-1">
                <Pill tone={r.verified ? "ok" : "warn"}>{r.verified ? t("যাচাই ✓", "Verified") : t("যাচাই বাকি", "Unverified")}</Pill>
                {r.expert && <Pill tone="info">{t("এক্সপার্ট", "Expert")}</Pill>}
                {r.hidden && <Pill tone="bad">{t("লুকানো", "Hidden")}</Pill>}
              </div></Td>
              <Td><div className="flex flex-wrap gap-1">
                <form action={setTutorFlag.bind(null, r.user_id, "verified", !r.verified)}><button className={ghostBtn}>{r.verified ? t("যাচাই বাতিল", "Unverify") : t("যাচাই", "Verify")}</button></form>
                <form action={setTutorFlag.bind(null, r.user_id, "expert", !r.expert)}><button className={ghostBtn}>{r.expert ? t("এক্সপার্ট −", "Expert −") : t("এক্সপার্ট +", "Expert +")}</button></form>
                <form action={setTutorFlag.bind(null, r.user_id, "hidden", !r.hidden)}><button className={ghostBtn}>{r.hidden ? t("দেখান", "Show") : t("লুকান", "Hide")}</button></form>
              </div></Td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}
