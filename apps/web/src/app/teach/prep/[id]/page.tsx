import Link from "next/link";
import { notFound } from "next/navigation";
import type { ClassLevel } from "@mastermoshai/core";
import { CONTENT } from "@/lib/content-catalog";
import { marketCopy } from "@/lib/copy-market";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import SheetView from "./SheetView";

export const dynamic = "force-dynamic";

export default async function PrepSheet({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const s = CONTENT.find((x) => x.id === id);
  if (!s) notFound();
  const lang = await getLang();
  const c = marketCopy(lang).prep;
  const t = Math.max(0, Math.min((s.topics?.length ?? 1) - 1, Number((await searchParams).t ?? 0) || 0));
  return (
    <div>
      <Link href={`/teach/prep?level=${s.level}&subject=${s.subject}`} className="text-sm text-ink-3 hover:text-ink">← {c.back}</Link>
      <div className="mt-1 text-xs text-ink-3">{L.subject(s.subject, lang)} · {L.level(s.level as ClassLevel, lang)} · {c.chapter(s.chapter)}</div>
      <h1 className="font-display text-2xl">{s.title[lang]}</h1>
      <SheetView href={s.href} topics={s.topics ?? []} start={t} labels={{ topics: c.topics, full: c.full, print: c.print }} />
    </div>
  );
}
