import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { toolsCopy } from "@/lib/copy-tools";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { growthCopy } from "@/lib/copy-growth";
import { marketCopy } from "@/lib/copy-market";
import { bizCopy } from "@/lib/copy-biz";
import { isVerifiedTutor } from "@/lib/biz/verify";

export const dynamic = "force-dynamic";

export default async function TeachLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/teach");
  const lang = await getLang();
  const t = toolsCopy(lang).teach;
  const g = growthCopy(lang).nav;
  const mk = marketCopy(lang).nav;
  const b = bizCopy(lang).nav;
  const bv = bizCopy(lang).verify;
  const nav = [
    ["/teach", t.nav.home],
    ["/teach/requests", mk.requests],
    ["/teach/prep", mk.prep],
    ["/teach/content", t.nav.content],
    ["/teach/packages", g.packages],
    ["/teach/questions", g.questions],
    ["/teach/pro", mk.pro],
    ["/teach/profile", t.nav.profile],
    ["/teach/wallet", b.wallet],
    ["/teach/verify", b.verify],
  ] as const;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-3">
        <span className="eyebrow">{t.panel}</span>
        {nav.map(([href, label]) => (
          <Link key={href} href={href} className="text-sm font-semibold text-ink-2 hover:text-ink">{label}</Link>
        ))}
      </div>
      {/* Pages that need the database render nothing while it is off; class prep works without it. */}
      {!DATA_LIVE && <p className="mt-6 rounded-lg bg-mist p-6 text-center text-sm text-ink-2">{t.off}</p>}
      {DATA_LIVE && !(await isVerifiedTutor(user.id)) && (
        <Link href="/teach/verify" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold bg-gold/15 p-4 text-sm">
          🪪 {bv.need} <span className="ml-auto font-semibold underline">{bv.go}</span>
        </Link>
      )}
      <div className="pt-6">{children}</div>
    </div>
  );
}
