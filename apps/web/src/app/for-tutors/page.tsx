import type { Metadata } from "next";
import Link from "next/link";
import { TierLadder } from "@/components/TierLadder";
import { getSettings } from "@/lib/admin/settings";
import { getUser } from "@/lib/auth/session";
import { bizCopy } from "@/lib/copy-biz";
import { getLang } from "@/lib/lang";

export const metadata: Metadata = { title: "পড়াতে চাই · মাস্টারমশাই", description: "জুম-মিটের খরচ নেই, বই কিনতে হবে না, পরীক্ষা বানাতে হবে না। ফোনেই পড়ান, কমিশন ২০% থেকে ৫%।" };

export default async function ForTutors() {
  const lang = await getLang();
  const c = bizCopy(lang);
  const j = c.join;
  const signedIn = Boolean(await getUser());
  const cta = signedIn ? "/teach" : "/login?next=/teach/profile";
  return (
    <>
      <section className="bg-board text-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <p className="text-[15px] font-semibold text-gold">{j.eyebrow}</p>
          <h1 className="font-display mt-3 max-w-3xl text-5xl leading-[1.05] sm:text-6xl">{j.h1}</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">{j.sub}</p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link href={cta} className="btn-gold px-6! py-3!">{signedIn ? j.ctaIn : j.cta} →</Link>
            <span className="text-sm text-white/70">{j.zero}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {j.points.map(([h, body], i) => (
            <li key={h}>
              <div className="font-display text-4xl text-redpen">{String(i + 1).padStart(2, "0")}</div>
              <h2 className="mt-1 text-lg font-bold">{h}</h2>
              <p className="mt-1 text-[15px] text-ink-2">{body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 border-l-4 border-gold pl-4 text-[15px] font-medium">{j.unlimited}</p>
      </section>

      <section className="bg-board text-white">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="font-display text-4xl">{c.tiers.h}</h2>
          <p className="mt-2 max-w-2xl text-white/80">{c.tiers.sub}</p>
          <div className="mt-6"><TierLadder lang={lang} dark tiers={(await getSettings()).tiers} /></div>
          <ol className="mt-8 grid gap-3 text-sm text-white/80 sm:grid-cols-4">
            {c.wallet.howSteps.map((s, i) => <li key={s} className="border-t border-white/20 pt-2"><b className="text-gold">{lang === "en" ? i + 1 : "১২৩৪"[i]}.</b> {s}</li>)}
          </ol>
          <Link href={cta} className="btn-gold mt-8 inline-flex px-6! py-3!">{signedIn ? j.ctaIn : j.cta} →</Link>
        </div>
      </section>
    </>
  );
}
