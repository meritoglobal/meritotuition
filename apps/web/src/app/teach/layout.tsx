import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { toolsCopy } from "@/lib/copy-tools";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function TeachLayout({ children }: { children: React.ReactNode }) {
  if (!(await getUser())) redirect("/login?next=/teach");
  const t = toolsCopy(await getLang()).teach;
  const nav = [
    ["/teach", t.nav.home],
    ["/teach/content", t.nav.content],
    ["/teach/profile", t.nav.profile],
    ["/dashboard/teacher", t.nav.earnings],
  ] as const;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-3">
        <span className="eyebrow">{t.panel}</span>
        {nav.map(([href, label]) => (
          <Link key={href} href={href} className="text-sm font-semibold text-ink-2 hover:text-ink">{label}</Link>
        ))}
      </div>
      {DATA_LIVE ? <div className="pt-6">{children}</div> : <p className="mt-6 rounded-lg bg-mist p-6 text-center text-sm text-ink-2">{t.off}</p>}
    </div>
  );
}
