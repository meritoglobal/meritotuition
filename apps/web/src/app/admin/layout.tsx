import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/core";
import { db } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { AdminNav } from "./Nav";
import { tx } from "./ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "অ্যাডমিন · মাস্টারমশাই", robots: { index: false, follow: false } };

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const m = await requireAdmin("/admin");
  const lang = await getLang();
  const t = tx(lang);
  const b = (n: number) => (n ? L.num(n, lang) : undefined);
  const s = db();
  const head = { count: "exact" as const, head: true };
  const [tutors, payouts, complaints, changes, doubts] = await Promise.all([
    count(s.from("tutor_verifications").select("user_id", head).in("status", ["REVIEW", "PENDING"])),
    count(s.from("withdrawals").select("id", head).in("status", ["QUEUED", "SENDING"])),
    count(s.from("class_complaints").select("id", head).eq("status", "REVIEW")),
    count(s.from("schedule_changes").select("id", head).eq("status", "PENDING")),
    count(s.from("doubts").select("id", head).eq("status", "OPEN")),
  ]);
  const items = [
    { href: "/admin", label: t("এক নজরে", "Overview") },
    { href: "/admin/users", label: t("মানুষজন", "People") },
    { href: "/admin/tutors", label: t("টিউটর ও যাচাই", "Tutors & ID check"), badge: b(tutors) },
    { href: "/admin/batches", label: t("ব্যাচ ও ক্লাস", "Batches & classes"), badge: b(changes) },
    { href: "/admin/requests", label: t("টিউশন খোঁজ", "Tuition requests") },
    { href: "/admin/money", label: t("টাকাপয়সা", "Money") },
    { href: "/admin/payouts", label: t("পেআউট ও নালিশ", "Payouts & complaints"), badge: b(payouts + complaints) },
    { href: "/admin/content", label: t("কনটেন্ট ও পরীক্ষা", "Content & tests"), badge: b(doubts) },
    { href: "/admin/chat", label: t("চ্যাট পাহারা", "Chat watch") },
    { href: "/admin/announce", label: t("ঘোষণা", "Announce") },
    { href: "/admin/settings", label: t("সেটিংস ও লগ", "Settings & log") },
  ];
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-5 lg:flex-row lg:py-8">
      <aside className="lg:sticky lg:top-20 lg:h-fit lg:w-56 lg:shrink-0">
        <div className="mb-3 hidden rounded-lg bg-board px-3 py-3 text-white lg:block">
          <div className="text-xs text-white/60">{t("হেডমাস্টারের ঘর", "Headmaster's room")}</div>
          <div className="truncate text-sm font-semibold" title={m.email}>{m.email}</div>
        </div>
        <AdminNav items={items} />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
