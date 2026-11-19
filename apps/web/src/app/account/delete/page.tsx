import Link from "next/link";
import type { Metadata } from "next";
import { canDelete } from "@/lib/account";
import { getUser } from "@/lib/auth/session";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import DeleteForm from "./DeleteForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Delete account · Mastermoshai" };

const T = {
  bn: {
    h1: "অ্যাকাউন্ট মুছে ফেলা",
    intro: "চাইলে নিজের মাস্টারমশাই অ্যাকাউন্ট নিজেই মুছে ফেলতে পারো। মুছে ফেললে আর ফেরত আনা যায় না।",
    goneH: "যা মুছে যাবে", gone: ["লগইন (ইমেইল বা ফোন)", "প্রোফাইল, ব্যাচে নাম, হাজিরা, পরীক্ষার খাতা, নোটিফিকেশন", "চ্যাট, টিউশন রিকোয়েস্ট, প্রশ্ন, অভিভাবক লিংক", "টিউটরদের আইডি কার্ডের ছবি আর বিকাশ নম্বর"],
    keptH: "যা রেখে দিতে হয়", kept: "টাকার লেনদেনের হিসাব (পেমেন্ট, ফেরত, টিউটরের আয় আর তোলা টাকা) আইন অনুযায়ী রাখতে হয়। সেখানে শুধু ইমেইলটা থাকে। চালু থাকা অটো-রিনিউ বন্ধ হয়ে যাবে।",
    login: "মুছতে আগে লগইন করো", loginBtn: "লগইন করি",
    other: "লগইন করতে না পারলে support@mastermoshai.net-এ যে ইমেইল দিয়ে অ্যাকাউন্ট খুলেছিলে সেখান থেকে লিখো, আমরা ৭ দিনের মধ্যে মুছে দেব।",
    balance: (b: string, p: number) => `তোমার ওয়ালেটে এখনো ${b} আছে${p ? `, আর ${p}টা টাকা তোলা পথে আছে` : ""}। আগে টাকাটা তুলে নাও, তারপর মুছতে পারবে।`,
    wallet: "ওয়ালেটে যাই",
    confirm: "আমি বুঝেছি, অ্যাকাউন্ট চিরতরে মুছে যাবে।", button: "অ্যাকাউন্ট মুছে ফেলি",
    err: { confirm: "আগে টিক দিয়ে নিশ্চিত করো।", balance: "ওয়ালেটে টাকা আছে, আগে তুলে নাও।", auth: "লগইনটা মোছা গেল না। একটু পরে আবার চেষ্টা করো।", login: "আবার লগইন করো।" },
    done: "তোমার অ্যাকাউন্ট মুছে ফেলা হয়েছে। মাস্টারমশাইয়ের সাথে থাকার জন্য ধন্যবাদ।", home: "হোমপেজে যাই",
  },
  en: {
    h1: "Delete your account",
    intro: "You can delete your Mastermoshai account yourself. Once deleted it can't be brought back.",
    goneH: "What gets deleted", gone: ["Your login (email or phone)", "Profile, batch membership, attendance, exam scripts, notifications", "Chats, tuition requests, questions, guardian links", "Tutors' ID card photos and bKash number"],
    keptH: "What we must keep", kept: "Money records (payments, refunds, tutor earnings and payouts) are kept as the law requires. They hold only the email. Any auto-renewal is switched off.",
    login: "Log in to delete your account", loginBtn: "Log in",
    other: "Can't log in? Write to support@mastermoshai.net from the email you signed up with and we'll delete it within 7 days.",
    balance: (b: string, p: number) => `Your wallet still holds ${b}${p ? ` and ${p} payout(s) are on the way` : ""}. Withdraw it first, then you can delete.`,
    wallet: "Go to wallet",
    confirm: "I understand my account will be deleted for good.", button: "Delete my account",
    err: { confirm: "Tick the box to confirm.", balance: "Your wallet has money; withdraw it first.", auth: "Couldn't remove the login. Try again in a bit.", login: "Please log in again." },
    done: "Your account has been deleted. Thanks for being with Mastermoshai.", home: "Go to homepage",
  },
};

export default async function DeleteAccount({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const lang = await getLang();
  const t = T[lang === "en" ? "en" : "bn"];
  const { done } = await searchParams;
  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="font-display text-3xl">{t.h1}</h1>
        <p className="mt-4">{t.done}</p>
        <Link href="/" className="btn-board mt-6 inline-flex px-4! py-2!">{t.home}</Link>
      </div>
    );
  }
  const u = await getUser();
  const chk = u ? await canDelete(u.id) : null;
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl">{t.h1}</h1>
      <p className="mt-3 text-ink-2">{t.intro}</p>
      <h2 className="mt-6 font-semibold">{t.goneH}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{t.gone.map((x) => <li key={x}>{x}</li>)}</ul>
      <h2 className="mt-6 font-semibold">{t.keptH}</h2>
      <p className="mt-2 text-sm text-ink-2">{t.kept}</p>
      <div className="card mt-8 p-5">
        {!u ? (
          <>
            <p className="font-semibold">{t.login}</p>
            <Link href="/login?next=/account/delete" className="btn-board mt-3 inline-flex px-4! py-2!">{t.loginBtn}</Link>
          </>
        ) : !chk!.ok ? (
          <>
            <p className="text-sm">{t.balance(L.taka(chk!.balance, lang), chk!.pending)}</p>
            <Link href="/teach/wallet" className="btn-board mt-3 inline-flex px-4! py-2!">{t.wallet}</Link>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-3">{u.email ?? u.phone}</p>
            <DeleteForm t={t} />
          </>
        )}
      </div>
      <p className="mt-6 text-xs text-ink-3">{t.other}</p>
    </div>
  );
}
