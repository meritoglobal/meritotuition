import Link from "next/link";
import { db } from "@/lib/data";
import { dhakaDay } from "@/lib/growth/people";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { PageHead, Pill, Section, Stat, statusTone, Table, Td, tx } from "./ui";

export const dynamic = "force-dynamic";

type Num = { count: number | null };
const n = async (q: PromiseLike<Num>) => (await q).count ?? 0;
const sum = <T,>(rows: T[] | null | undefined, f: (r: T) => number) => (rows ?? []).reduce((a, r) => a + (Number(f(r)) || 0), 0);

export default async function AdminHome() {
  const lang = await getLang();
  const t = tx(lang);
  const s = db();
  const head = { count: "exact" as const, head: true };
  const today = dhakaDay();
  const monthStart = `${today.slice(0, 7)}-01T00:00:00+06:00`;
  const [stats, tutors, verified, batches, enrol, subs, csubs, todayClasses, openReq, paidMonth, earnMonth, wallet, recentPay, recentUsers, log, vq, wq, cq, sq, dq] = await Promise.all([
    s.rpc("admin_user_stats"),
    n(s.from("teacher_profiles").select("user_id", head)),
    n(s.from("teacher_profiles").select("user_id", head).eq("verified", true)),
    n(s.from("batches").select("id", head).eq("active", true)),
    n(s.from("batch_students").select("email", head)),
    n(s.from("subscriptions").select("id", head).eq("status", "ACTIVE")),
    n(s.from("content_subscriptions").select("id", head).eq("status", "ACTIVE")),
    s.from("class_sessions").select("status").eq("day", today).limit(5000),
    n(s.from("tuition_requests").select("id", head).eq("status", "OPEN")),
    s.from("payments").select("amount,purpose").eq("status", "PAID").gte("paid_at", monthStart).limit(20000),
    s.from("wallet_entries").select("amount,commission").eq("kind", "EARNING").gte("created_at", monthStart).limit(20000),
    s.from("wallet_entries").select("amount").limit(50000),
    s.from("payments").select("id,purpose,payer_email,amount,status,created_at").order("created_at", { ascending: false }).limit(8),
    s.rpc("admin_find_users", { q: "", lim: 8, off: 0 }),
    s.from("admin_log").select("*").order("created_at", { ascending: false }).limit(8),
    n(s.from("tutor_verifications").select("user_id", head).in("status", ["REVIEW", "PENDING"])),
    n(s.from("withdrawals").select("id", head).in("status", ["QUEUED", "SENDING"])),
    n(s.from("class_complaints").select("id", head).eq("status", "REVIEW")),
    n(s.from("schedule_changes").select("id", head).eq("status", "PENDING")),
    n(s.from("doubts").select("id", head).eq("status", "OPEN")),
  ]);
  const sqlMissing = Boolean(stats.error || log.error);
  const u = (stats.data as { total: number; today: number; week: number; active_week: number }[] | null)?.[0];
  const num = (v: number | undefined) => (v === undefined ? "—" : L.count(Number(v), lang));
  const taka = (v: number) => L.taka(Math.round(v), lang);
  const cls = todayClasses.data ?? [];
  const revenue = sum(paidMonth.data, (r) => r.amount);
  const commission = sum(earnMonth.data, (r) => r.commission);
  const owed = sum(wallet.data, (r) => r.amount);
  const todo = vq + wq + cq + sq + dq;

  return (
    <div>
      <PageHead title={t("এক নজরে পুরো স্কুল", "The whole school at a glance")} sub={t("আজকের হাজিরা, টাকার হিসাব আর যা যা আপনার সই চায়।", "Today's roll call, the money, and everything waiting for your signature.")} />
      {sqlMissing && (
        <p className="mt-4 rounded-lg border border-redpen bg-redpen-tint px-3 py-2 text-sm text-redpen">
          {t("supabase/admin.sql এখনো চালানো হয়নি। Supabase SQL Editor-এ একবার চালালে ইউজার লিস্ট, লগ আর সেটিংস চালু হবে।", "supabase/admin.sql has not been run yet. Run it once in the Supabase SQL Editor to switch on the user list, log and settings.")}
        </p>
      )}

      <Section title={t("আপনার টেবিলে যা পড়ে আছে", "Waiting on your desk")} right={todo === 0 ? <Pill tone="ok">{t("সব ফাঁকা, চা খান", "All clear")}</Pill> : null}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label={t("আইডি যাচাই", "ID checks")} value={num(vq)} href="/admin/tutors" alert={vq > 0} />
          <Stat label={t("টাকা তোলার আবেদন", "Withdrawals")} value={num(wq)} href="/admin/payouts" alert={wq > 0} />
          <Stat label={t("নালিশ", "Complaints")} value={num(cq)} href="/admin/payouts" alert={cq > 0} />
          <Stat label={t("রুটিন বদলের প্রস্তাব", "Routine changes")} value={num(sq)} href="/admin/batches?tab=changes" />
          <Stat label={t("উত্তরের অপেক্ষায় প্রশ্ন", "Unanswered questions")} value={num(dq)} href="/admin/content?tab=doubts" />
        </div>
      </Section>

      <Section title={t("মানুষজন", "People")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("মোট অ্যাকাউন্ট", "Accounts")} value={num(u?.total)} href="/admin/users" />
          <Stat label={t("আজ নতুন / ৭ দিনে", "New today / 7 days")} value={u ? `${num(u.today)} / ${num(u.week)}` : "—"} />
          <Stat label={t("৭ দিনে লগইন করেছে", "Signed in, 7 days")} value={num(u?.active_week)} />
          <Stat label={t("টিউটর (যাচাই হয়েছে)", "Tutors (verified)")} value={`${num(tutors)} (${num(verified)})`} href="/admin/tutors?tab=all" />
        </div>
      </Section>

      <Section title={t("ক্লাসঘর", "Classrooms")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("চালু ব্যাচ", "Active batches")} value={num(batches)} href="/admin/batches" />
          <Stat label={t("ব্যাচে ছাত্রের আসন", "Student seats")} value={num(enrol)} />
          <Stat label={t("আজকের ক্লাস (ফাঁকা গেছে)", "Classes today (empty)")} value={`${num(cls.length)} (${num(cls.filter((c) => c.status === "EMPTY").length)})`} href="/admin/batches?tab=sessions" />
          <Stat label={t("খোলা টিউশন খোঁজ", "Open tuition requests")} value={num(openReq)} href="/admin/requests" />
        </div>
      </Section>

      <Section title={t("এই মাসের টাকা", "This month's money")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("এসেছে (bKash)", "Collected (bKash)")} value={taka(revenue)} href="/admin/money" />
          <Stat label={t("আমাদের কমিশন", "Our commission")} value={taka(commission)} />
          <Stat label={t("টিউটরদের ওয়ালেটে পাওনা", "Owed in tutor wallets")} value={taka(owed)} href="/admin/payouts" />
          <Stat label={t("চালু প্যাকেজ / কনটেন্ট প্যাক", "Active packages / content packs")} value={`${num(subs)} / ${num(csubs)}`} href="/admin/money?tab=subs" />
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("নতুন অ্যাকাউন্ট", "Newest accounts")} right={<Link href="/admin/users" className="underline">{t("সবাই", "All")}</Link>}>
          <Table head={[t("ইমেইল", "Email"), t("যোগ দিয়েছে", "Joined")]} empty={!(recentUsers.data ?? []).length && t("এখনো কেউ নেই", "Nobody yet")}>
            {((recentUsers.data ?? []) as { id: string; email: string; created_at: string }[]).map((r) => (
              <tr key={r.id}><Td><Link href={`/admin/users/${r.id}`} className="underline">{r.email}</Link></Td><Td className="text-ink-3">{L.dateTime(new Date(r.created_at), lang)}</Td></tr>
            ))}
          </Table>
        </Section>
        <Section title={t("শেষ পেমেন্ট", "Latest payments")} right={<Link href="/admin/money" className="underline">{t("সব", "All")}</Link>}>
          <Table head={[t("কে", "Who"), t("কীসের", "For"), t("টাকা", "Amount"), t("অবস্থা", "Status")]} empty={!(recentPay.data ?? []).length && t("এখনো কোনো পেমেন্ট নেই", "No payments yet")}>
            {(recentPay.data ?? []).map((p) => (
              <tr key={p.id}><Td>{p.payer_email}</Td><Td>{p.purpose}</Td><Td>{taka(p.amount)}</Td><Td><Pill tone={statusTone(p.status)}>{p.status}</Pill></Td></tr>
            ))}
          </Table>
        </Section>
      </div>

      <Section title={t("কে কী করলেন (অ্যাডমিন লগ)", "Who did what (admin log)")} right={<Link href="/admin/settings?tab=log" className="underline">{t("পুরো লগ", "Full log")}</Link>}>
        <Table head={[t("কখন", "When"), t("অ্যাডমিন", "Admin"), t("কাজ", "Action"), t("কার উপর", "Target")]} empty={!(log.data ?? []).length && t("এখনো কিছু হয়নি", "Nothing yet")}>
          {(log.data ?? []).map((r) => (
            <tr key={r.id}><Td className="text-ink-3">{L.dateTime(new Date(r.created_at), lang)}</Td><Td>{r.admin_email}</Td><Td>{r.action}</Td><Td>{r.target}</Td></tr>
          ))}
        </Table>
      </Section>
    </div>
  );
}
