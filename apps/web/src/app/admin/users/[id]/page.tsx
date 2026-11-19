import Link from "next/link";
import { notFound } from "next/navigation";
import { CONTENT_SEGMENTS, SEGMENT_LABEL } from "@mastermoshai/core";
import { getAccount, rolesOf } from "@/lib/admin/people";
import { OWNER_EMAILS } from "@/lib/admin/core";
import { tierOf } from "@/lib/biz/earnings";
import { db } from "@/lib/data";
import { isUuid } from "@/lib/growth/people";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { blockUser, giveCredit, notifyOne, setSegment, setTutorFlag, unblockUser, walletAdjust } from "../../actions";
import { Confirm } from "../../Confirm";
import { dangerBtn, ghostBtn, input, PageHead, Pill, Section, Stat, statusTone, Table, Td, tx } from "../../ui";

export const dynamic = "force-dynamic";

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const lang = await getLang();
  const t = tx(lang);
  const acc = await getAccount(id);
  if (!acc) notFound();
  const email = acc.email;
  const s = db();
  const [roles, prof, block, seg, taught, enrolled, pays, subs, csubs, credits, guard, kids, refs, compl, wallet, wd] = await Promise.all([
    rolesOf([acc]),
    s.from("teacher_profiles").select("*").or(`user_id.eq.${id},email.eq.${email}`).limit(1).maybeSingle(),
    s.from("account_blocks").select("*").eq("email", email).maybeSingle(),
    s.from("student_segments").select("*").eq("email", email).maybeSingle(),
    s.from("batches").select("id,title,subject,level,active,created_at").eq("teacher_id", id).order("created_at", { ascending: false }).limit(50),
    s.from("batch_students").select("batch_id,added_at,batches(title,teacher_id)").eq("email", email).limit(50),
    s.from("payments").select("*").eq("payer_email", email).order("created_at", { ascending: false }).limit(30),
    s.from("subscriptions").select("*,packages(title,teacher_name)").or(`student_email.eq.${email},payer_email.eq.${email}`).order("created_at", { ascending: false }).limit(30),
    s.from("content_subscriptions").select("*").or(`student_email.eq.${email},payer_email.eq.${email}`).order("created_at", { ascending: false }).limit(30),
    s.from("credits").select("*").eq("email", email).order("created_at", { ascending: false }).limit(50),
    s.from("guardian_links").select("*").eq("student_email", email),
    s.from("guardian_links").select("*").eq("guardian_email", email),
    s.from("referrals").select("*").or(`referee_email.eq.${email},referrer_email.eq.${email}`).limit(50),
    s.from("class_complaints").select("*").or(`student_email.eq.${email},teacher_id.eq.${id}`).order("created_at", { ascending: false }).limit(30),
    s.from("wallet_entries").select("*").eq("teacher_id", id).order("created_at", { ascending: false }).limit(30),
    s.from("withdrawals").select("*").eq("teacher_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  const ro = roles.get(id)!;
  const p = prof.data as null | { user_id: string; name: string; phone: string | null; university: string | null; subjects: string[]; levels: string[]; verified: boolean; expert: boolean; hidden?: boolean; price_online: number | null; home_area: string | null };
  const tid = p?.user_id ?? id;
  const [tier, bal] = p ? await Promise.all([tierOf(tid), s.rpc("wallet_balance", { t: tid })]) : [null, null];
  const creditBal = (credits.data ?? []).reduce((a, c) => a + Number(c.amount), 0);
  const taka = (n: number) => L.taka(n, lang);
  const when = (d: string | null) => (d ? L.dateTime(new Date(d), lang) : "—");
  const owner = OWNER_EMAILS.includes(email);

  return (
    <div>
      <p className="text-sm"><Link href="/admin/users" className="underline">{t("← সবাই", "← Everyone")}</Link></p>
      <PageHead title={p?.name ? `${p.name}` : email} sub={`${email} · ${t("যোগ", "joined")} ${when(acc.created_at)} · ${t("শেষ লগইন", "last sign-in")} ${when(acc.last_sign_in_at)}`}>
        {ro.admin && <Pill tone="info">{t("অ্যাডমিন", "Admin")}</Pill>}
        {ro.tutor && <Pill tone={ro.verified ? "ok" : "warn"}>{ro.verified ? t("যাচাই করা টিউটর", "Verified tutor") : t("টিউটর (যাচাই বাকি)", "Tutor (unverified)")}</Pill>}
        {ro.student && <Pill>{t("ছাত্র", "Student")}</Pill>}
        {ro.parent && <Pill>{t("অভিভাবক", "Parent")}</Pill>}
        {block.data && <Pill tone="bad">{t("সাসপেন্ড", "Suspended")}</Pill>}
      </PageHead>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="font-semibold">{t("অ্যাকাউন্ট কন্ট্রোল", "Account control")}</h3>
          {block.data ? (
            <div className="mt-3 text-sm">
              <p className="text-redpen">{t("সাসপেন্ড করা আছে", "Suspended")}{block.data.reason ? `: ${block.data.reason}` : ""} · {block.data.blocked_by} · {when(block.data.created_at)}</p>
              <form action={unblockUser.bind(null, id, email)} className="mt-2"><button className={ghostBtn}>{t("সাসপেন্ড তুলে নিন", "Lift suspension")}</button></form>
            </div>
          ) : owner ? (
            <p className="mt-3 text-sm text-ink-3">{t("ইনি মালিক (ADMIN_EMAILS), এঁকে সাসপেন্ড করা যায় না।", "Owner (ADMIN_EMAILS): cannot be suspended.")}</p>
          ) : (
            <form action={blockUser.bind(null, id, email)} className="mt-3 flex flex-wrap gap-2">
              <input name="reason" placeholder={t("কারণ (নিজের জন্য নোট)", "Reason (note for the team)")} className={`${input} flex-1`} />
              <Confirm ask={t("সত্যিই সাসপেন্ড করবেন? এই মানুষটি আর লগইন করতে পারবে না।", "Suspend? This person will not be able to sign in.")} className={dangerBtn}>{t("সাসপেন্ড", "Suspend")}</Confirm>
            </form>
          )}
          <p className="mt-2 text-xs text-ink-3">{t("সাসপেন্ড করলে লগইন বন্ধ হয়, টিউটর হলে সার্চ থেকেও লুকিয়ে যায়। কোনো ডেটা মোছে না।", "Suspending stops sign-in and hides a tutor from search. Nothing is deleted.")}</p>

          <h3 className="mt-5 font-semibold">{t("নোটিফিকেশন পাঠান", "Send a notification")}</h3>
          <form action={notifyOne.bind(null, email)} className="mt-2 grid gap-2">
            <input name="title" required placeholder={t("শিরোনাম", "Title")} className={input} />
            <textarea name="body" placeholder={t("বিস্তারিত (ঐচ্ছিক)", "Details (optional)")} className={input} rows={2} />
            <div className="flex flex-wrap items-center gap-3">
              <input name="path" placeholder={t("ট্যাপ করলে কোথায় যাবে, যেমন /learn", "Opens on tap, e.g. /learn")} className={`${input} flex-1`} />
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="mail" value="1" /> {t("ইমেইলেও", "Email too")}</label>
              <button className={ghostBtn}>{t("পাঠান", "Send")}</button>
            </div>
          </form>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold">{t("ক্রেডিট (ফ্রি টাকা)", "Credit (free money)")}: {taka(creditBal)}</h3>
          <form action={giveCredit.bind(null, email)} className="mt-2 flex flex-wrap gap-2">
            <input name="amount" type="number" required placeholder={t("৳ (কাটতে চাইলে মাইনাস)", "৳ (minus to take back)")} className={`${input} w-40`} />
            <input name="note" placeholder={t("কারণ", "Reason")} className={`${input} flex-1`} />
            <button className={ghostBtn}>{t("যোগ করুন", "Add")}</button>
          </form>
          <p className="mt-1 text-xs text-ink-3">{t("পরের পেমেন্টে নিজে থেকেই কাটা যায়।", "Used up automatically on the next payment.")}</p>

          <h3 className="mt-5 font-semibold">{t("কনটেন্ট প্যাক (ক্লাস/গ্রুপ তালা)", "Content pack (class/group lock)")}</h3>
          <form action={setSegment.bind(null, email)} className="mt-2 flex flex-wrap gap-2">
            <select name="segment" defaultValue={seg.data?.segment ?? ""} className={input}>
              <option value="">{t("— কোনোটা না (তালা খুলুন) —", "— none (unlock) —")}</option>
              {CONTENT_SEGMENTS.map((c) => <option key={c} value={c}>{SEGMENT_LABEL[c][lang]}</option>)}
            </select>
            <button className={ghostBtn}>{t("সেভ", "Save")}</button>
          </form>
          <p className="mt-1 text-xs text-ink-3">{t("প্রথম পেমেন্টে ছাত্র এক প্যাকে আটকে যায়, শুধু অ্যাডমিনই বদলাতে পারে।", "The first paid pack locks a student; only an admin can move them.")}</p>

          <p className="mt-5 text-sm">
            <Link href={`/admin/chat?q=${encodeURIComponent(email)}`} className="underline">{t("এই মানুষের চ্যাট দেখুন →", "See this person's chats →")}</Link>
          </p>
        </div>
      </div>

      {p && (
        <Section title={t("টিউটর হিসেবে", "As a tutor")} right={<Link href={`/teachers/${p.user_id}`} className="underline">{t("পাবলিক প্রোফাইল", "Public profile")}</Link>}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t("ওয়ালেট ব্যালান্স", "Wallet balance")} value={taka(Number(bal?.data ?? 0))} />
            <Stat label={t("কমিশন স্তর", "Commission tier")} value={tier ? `${L.num(Math.round(tier.tier.rate * 100), lang)}% · ${tier.tier.label[lang]}` : "—"} />
            <Stat label={t("মোট পেয়িং ছাত্র", "Paying students, ever")} value={L.count(tier?.students ?? 0, lang)} />
            <Stat label={t("ব্যাচ", "Batches")} value={L.count((taught.data ?? []).length, lang)} />
          </div>
          <div className="card mt-3 flex flex-wrap items-center gap-2 p-4 text-sm">
            <span className="text-ink-2">{p.university ?? ""} · {(p.subjects ?? []).join(", ")} · {p.phone ?? ""}</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <form action={setTutorFlag.bind(null, p.user_id, "verified", !p.verified)}><button className={p.verified ? dangerBtn : ghostBtn}>{p.verified ? t("যাচাই বাতিল", "Unverify") : t("যাচাই করুন ✓", "Verify ✓")}</button></form>
              <form action={setTutorFlag.bind(null, p.user_id, "expert", !p.expert)}><button className={ghostBtn}>{p.expert ? t("এক্সপার্ট ব্যাজ সরান", "Remove expert") : t("এক্সপার্ট ব্যাজ দিন", "Make expert")}</button></form>
              <form action={setTutorFlag.bind(null, p.user_id, "hidden", !p.hidden)}><button className={ghostBtn}>{p.hidden ? t("সার্চে দেখান", "Show in search") : t("সার্চ থেকে লুকান", "Hide from search")}</button></form>
            </div>
          </div>
          <form action={walletAdjust.bind(null, p.user_id)} className="card mt-3 flex flex-wrap items-center gap-2 p-4 text-sm">
            <b>{t("ওয়ালেটে হাতে যোগ/বিয়োগ", "Adjust wallet by hand")}</b>
            <input name="amount" type="number" required placeholder="৳ (+/-)" className={`${input} w-32`} />
            <input name="note" required placeholder={t("কারণ (টিউটর দেখবে)", "Reason (tutor sees it)")} className={`${input} flex-1`} />
            <Confirm ask={t("ওয়ালেটে টাকা বদলাবেন?", "Change this wallet?")} className={ghostBtn}>{t("সেভ", "Save")}</Confirm>
          </form>
          <div className="mt-3 grid gap-4 xl:grid-cols-2">
            <Table head={[t("কখন", "When"), t("ধরন", "Kind"), "৳", t("নোট", "Note")]} empty={!(wallet.data ?? []).length && t("ওয়ালেটে কিছু নেই", "Empty wallet")}>
              {(wallet.data ?? []).map((w) => <tr key={w.id}><Td className="text-ink-3">{when(w.created_at)}</Td><Td>{w.kind}</Td><Td className={w.amount < 0 ? "text-redpen" : ""}>{taka(w.amount)}</Td><Td className="text-ink-3">{w.note ?? (w.commission ? `${t("কমিশন", "commission")} ${taka(w.commission)}` : "")}</Td></tr>)}
            </Table>
            <Table head={[t("টাকা তোলা", "Withdrawal"), t("নম্বর", "Number"), t("অবস্থা", "Status")]} empty={!(wd.data ?? []).length && t("এখনো তোলেনি", "None yet")}>
              {(wd.data ?? []).map((w) => <tr key={w.id}><Td>{taka(w.amount)} · <span className="text-ink-3">{when(w.created_at)}</span></Td><Td>{w.msisdn}</Td><Td><Pill tone={statusTone(w.status)}>{w.status}</Pill> {w.trx_id ?? ""}</Td></tr>)}
            </Table>
          </div>
          {(taught.data ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {(taught.data ?? []).map((b) => <Link key={b.id} href={`/admin/batches?q=${encodeURIComponent(b.title)}`} className="tag bg-mist text-ink">{b.title}{b.active ? "" : ` (${t("বন্ধ", "off")})`}</Link>)}
            </div>
          )}
        </Section>
      )}

      <Section title={t("ছাত্র / অভিভাবক হিসেবে", "As a student / parent")}>
        <div className="grid gap-4 xl:grid-cols-2">
          <Table head={[t("ব্যাচ", "Batch"), t("যোগ", "Added")]} empty={!(enrolled.data ?? []).length && t("কোনো ব্যাচে নেই", "Not in any batch")}>
            {(enrolled.data ?? []).map((b) => {
              const bt = b.batches as unknown as { title: string } | null;
              return <tr key={b.batch_id}><Td>{bt?.title ?? b.batch_id}</Td><Td className="text-ink-3">{when(b.added_at)}</Td></tr>;
            })}
          </Table>
          <Table head={[t("প্যাকেজ", "Package"), t("অবস্থা", "Status"), t("মেয়াদ", "Until")]} empty={!(subs.data ?? []).length && !(csubs.data ?? []).length && t("কোনো প্যাকেজ নেই", "No packages")}>
            {(subs.data ?? []).map((x) => {
              const pk = x.packages as unknown as { title: string; teacher_name: string | null } | null;
              return <tr key={x.id}><Td>{pk?.title ?? "—"} <span className="text-ink-3">· {pk?.teacher_name ?? ""}</span></Td><Td><Pill tone={statusTone(x.status)}>{x.status}</Pill></Td><Td className="text-ink-3">{when(x.current_period_end)}</Td></tr>;
            })}
            {(csubs.data ?? []).map((x) => <tr key={x.id}><Td>{t("কনটেন্ট প্যাক", "Content pack")} · {x.segment}</Td><Td><Pill tone={statusTone(x.status)}>{x.status}</Pill></Td><Td className="text-ink-3">{when(x.current_period_end)}</Td></tr>)}
          </Table>
        </div>
        <div className="mt-4">
          <Table head={[t("পেমেন্ট", "Payment"), t("কীসের", "For"), "৳", t("অবস্থা", "Status"), "TrxID"]} empty={!(pays.data ?? []).length && t("কোনো পেমেন্ট নেই", "No payments")}>
            {(pays.data ?? []).map((x) => <tr key={x.id}><Td className="text-ink-3">{when(x.created_at)}</Td><Td>{x.purpose}</Td><Td>{taka(x.amount)}{x.discount || x.credit_used ? <span className="text-ink-3"> ({taka(x.list_price)})</span> : null}</Td><Td><Pill tone={statusTone(x.status)}>{x.status}</Pill></Td><Td className="font-mono text-xs">{x.trx_id ?? ""}</Td></tr>)}
          </Table>
        </div>
        {((guard.data ?? []).length > 0 || (kids.data ?? []).length > 0) && (
          <p className="mt-3 text-sm text-ink-2">
            {(guard.data ?? []).length > 0 && <>{t("অভিভাবক", "Parents")}: {(guard.data ?? []).map((g) => g.guardian_email).join(", ")}. </>}
            {(kids.data ?? []).length > 0 && <>{t("সন্তান", "Children")}: {(kids.data ?? []).map((g) => g.student_name ?? g.student_email).join(", ")}.</>}
          </p>
        )}
        {(refs.data ?? []).length > 0 && (
          <p className="mt-2 text-sm text-ink-2">{t("রেফারেল", "Referrals")}: {(refs.data ?? []).map((r) => (r.referee_email === email ? `${t("এনেছেন", "brought by")} ${r.referrer_email}` : r.referee_email) + ` (${r.status})`).join(", ")}</p>
        )}
      </Section>

      {(compl.data ?? []).length > 0 && (
        <Section title={t("নালিশ", "Complaints")}>
          <Table head={[t("কখন", "When"), t("কারণ", "Reason"), t("অবস্থা", "Status")]}>
            {(compl.data ?? []).map((c) => <tr key={c.id}><Td className="text-ink-3">{when(c.created_at)}</Td><Td>{c.reason}{c.details ? ` · ${c.details}` : ""}</Td><Td><Pill tone={statusTone(c.status)}>{c.status}</Pill></Td></tr>)}
          </Table>
        </Section>
      )}
    </div>
  );
}
