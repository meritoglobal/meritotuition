import type { Metadata } from "next";
import { getLang } from "@/lib/lang";

/** Contact for privacy requests. Set NEXT_PUBLIC_SUPPORT_EMAIL in Netlify. */
const EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@mastermoshai.net";
const UPDATED = { bn: "১২ নভেম্বর ২০২৬", en: "12 November 2026" };

export const metadata: Metadata = { title: "গোপনীয়তা নীতি · Privacy policy · Mastermoshai" };

const BN: [string, string[]][] = [
  ["আমরা কে", ["মাস্টারমশাই (Merito-র একটি সেবা) ঢাকার ছাত্রছাত্রীদের সাথে যাচাই করা টিউটরদের মিলিয়ে দেয়: অনলাইন লাইভ ক্লাস আর বাসায় গিয়ে পড়ানো। এই নীতি ওয়েবসাইট আর মোবাইল অ্যাপ দুটোর জন্যই।"]],
  ["কী কী তথ্য নিই", [
    "লগইনের জন্য: ইমেইল (পরে মোবাইল নম্বর)।",
    "প্রোফাইল: নাম; টিউটরদের ক্ষেত্রে বিশ্ববিদ্যালয়, বিষয়, এলাকা, ফি আর মোবাইল নম্বর (মোবাইল নম্বর কাউকে দেখানো হয় না)।",
    "ক্লাসের তথ্য: কে কখন ক্লাসে ঢুকল আর বের হলো (হাজিরা), চ্যাট, পোলের উত্তর, পরীক্ষার খাতা আর নম্বর, টিউটরের আপলোড করা ফাইল।",
    "ক্লাস রেকর্ডিং: যারা ক্লাস মিস করে তাদের জন্য লাইভ ক্লাস রেকর্ড হয়। রেকর্ডিং শুধু ওই ব্যাচের টিউটর আর ছাত্ররা দেখতে পায়।",
    "ক্যামেরা আর মাইক: শুধু লাইভ ক্লাস চলার সময়, তুমি চালু করলে। আমরা আলাদা করে ছবি বা আওয়াজ জমা রাখি না, শুধু উপরের রেকর্ডিংটা থাকে।",
    "লোকেশন: শুধু তুমি অনুমতি দিলে, কাছের বাসার টিউটর খুঁজতে। জমা রাখি না।",
    "টাকা: বিকাশ, নগদ বা কার্ডের তথ্য আমরা দেখি না, রাখিও না। পেমেন্ট সরাসরি তাদের পাতায় হয়।",
  ]],
  ["তথ্য কেন লাগে", ["ক্লাস চালাতে, হাজিরা আর টাকা ফেরতের হিসাব রাখতে, পরীক্ষার নম্বর দেখাতে, ক্লাসের খবর পাঠাতে, আর প্রতারণা ঠেকাতে। বিজ্ঞাপনের জন্য তোমার তথ্য বিক্রি করি না, কারো সাথে ভাগও করি না।"]],
  ["কারা তথ্য রাখে", ["আমাদের হয়ে কয়েকটি সেবা তথ্য রাখে: Supabase (ডেটাবেস আর ফাইল), LiveKit (লাইভ ভিডিও আর রেকর্ডিং), Netlify (ওয়েবসাইট)। তারা শুধু আমাদের কাজের জন্য তথ্য ব্যবহার করতে পারে।"]],
  ["কতদিন রাখি", ["অ্যাকাউন্ট চালু থাকা পর্যন্ত। ক্লাস রেকর্ডিং সর্বোচ্চ ১২ মাস। হিসাবের রেকর্ড আইন অনুযায়ী যতদিন রাখা দরকার।"]],
  ["তোমার অধিকার", [`নিজের তথ্য দেখতে, ঠিক করতে বা অ্যাকাউন্ট আর সব তথ্য মুছে ফেলতে চাইলে ${EMAIL}-এ ইমেইল করো। ৩০ দিনের মধ্যে করে দেব।`]],
  ["ছোটদের তথ্য", ["১৩ বছরের কম বয়সীদের অ্যাকাউন্ট অভিভাবকের অনুমতি নিয়ে খোলা উচিত। অভিভাবক চাইলে যেকোনো সময় সন্তানের তথ্য মুছে দিতে বলতে পারেন।"]],
  ["নীতি বদলালে", ["বড় কোনো বদল হলে সাইটে আর অ্যাপে জানিয়ে দেব।"]],
];

const EN: [string, string[]][] = [
  ["Who we are", ["Mastermoshai (a Merito service) connects students in Dhaka with verified tutors for online live classes and home tuition. This policy covers both the website and the mobile app."]],
  ["What we collect", [
    "For login: your email (later, your mobile number).",
    "Profile: your name; for tutors also university, subjects, area, fees and mobile number (the mobile number is never shown to anyone).",
    "Class data: who joined and left each class and when (attendance), chat, poll answers, exam scripts and marks, and files tutors upload.",
    "Class recordings: live classes are recorded for students who miss them. Only that batch's tutor and students can watch them.",
    "Camera and microphone: only during a live class, when you switch them on. We keep no separate audio or images beyond the class recording above.",
    "Location: only if you allow it, to find home tutors near you. Not stored.",
    "Payments: we never see or store bKash, Nagad or card details. Payment happens on their own pages.",
  ]],
  ["Why we need it", ["To run classes, keep attendance and refunds fair, show exam results, send class reminders, and prevent fraud. We do not sell your data or share it for advertising."]],
  ["Who stores it", ["A few services store data on our behalf: Supabase (database and files), LiveKit (live video and recordings) and Netlify (website). They may use it only to provide their service to us."]],
  ["How long we keep it", ["While your account is open. Class recordings for up to 12 months. Payment records for as long as the law requires."]],
  ["Your rights", [`To see, correct or delete your data or your whole account, email ${EMAIL}. We will do it within 30 days.`]],
  ["Children", ["Accounts for children under 13 should be opened with a parent's permission. A parent can ask us to delete their child's data at any time."]],
  ["Changes", ["If we make a significant change, we will tell you on the site and in the app."]],
];

export default async function Privacy() {
  const lang = await getLang();
  const body = lang === "en" ? EN : BN;
  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-4xl">{lang === "en" ? "Privacy policy" : "গোপনীয়তা নীতি"}</h1>
      <p className="mt-2 text-sm text-ink-3">{lang === "en" ? "Last updated" : "শেষ বদল"}: {UPDATED[lang === "en" ? "en" : "bn"]}</p>
      {body.map(([h, ps]) => (
        <section key={h} className="mt-8">
          <h2 className="text-xl font-semibold">{h}</h2>
          {ps.length === 1 ? <p className="mt-2 leading-relaxed text-ink-2">{ps[0]}</p> : (
            <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed text-ink-2">{ps.map((p) => <li key={p}>{p}</li>)}</ul>
          )}
        </section>
      ))}
    </article>
  );
}
