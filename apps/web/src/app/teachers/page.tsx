import Link from "next/link";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { getLang } from "@/lib/lang";

/** /teachers asks one question first: online or at home? Old ?mode= links still work. */
export default async function TeachersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { mode, ...rest } = await searchParams;
  const qs = new URLSearchParams(Object.entries(rest).filter(([, v]) => v) as [string, string][]).toString();
  if (mode === "ONLINE") redirect(`/teachers/online${qs ? `?${qs}` : ""}`);
  if (mode === "OFFLINE") redirect(`/teachers/home${qs ? `?${qs}` : ""}`);

  const lang = await getLang();
  const c = copy(lang);
  return (
    <section className="bg-board text-white">
      <div className="mx-auto max-w-7xl px-5 py-16">
        <h1 className="font-display max-w-3xl text-4xl leading-tight sm:text-6xl">{c.search.chooseH1}</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/75">{c.search.chooseSub}</p>
        <div className="mt-10 grid gap-5 text-ink md:grid-cols-2">
          <Link href="/teachers/online" className="group rounded-xl bg-online p-8">
            <div className="text-sm font-semibold text-online-ink">{c.home.two.onLabel}</div>
            <div className="font-display mt-2 text-3xl">{c.home.two.onTitle}</div>
            <p className="mt-3 text-ink-2">{c.home.two.onText}</p>
            <div className="mt-6 font-semibold text-online-ink group-hover:underline">{c.home.two.onLink}</div>
          </Link>
          <Link href="/teachers/home" className="group rounded-xl bg-home p-8">
            <div className="text-sm font-semibold text-home-ink">{c.home.two.offLabel}</div>
            <div className="font-display mt-2 text-3xl">{c.home.two.offTitle}</div>
            <p className="mt-3 text-ink-2">{c.home.two.offText}</p>
            <div className="mt-6 font-semibold text-home-ink group-hover:underline">{c.home.two.offLink}</div>
          </Link>
        </div>
      </div>
    </section>
  );
}
