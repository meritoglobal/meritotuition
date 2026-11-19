import Link from "next/link";
import { inStoreApp } from "@/lib/store-server";
import { notFound } from "next/navigation";
import { contentAccess, segmentOfContent } from "@mastermoshai/core";
import { accessContext } from "@/lib/biz/access";
import { CONTENT } from "@/lib/content-catalog";
import { bizCopy } from "@/lib/copy-biz";
import { marketCopy } from "@/lib/copy-market";
import { mustMe } from "@/lib/growth/page";
import { getLang } from "@/lib/lang";
import SheetView from "@/app/teach/prep/[id]/SheetView";

export const dynamic = "force-dynamic";

export default async function Sheet({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const m = await mustMe(`/learn/${id}`);
  const s = CONTENT.find((x) => x.id === id);
  if (!s) notFound();
  const lang = await getLang();
  const store = await inStoreApp();
  const c = bizCopy(lang).learn;
  const p = marketCopy(lang).prep;
  const a = contentAccess(s, await accessContext(m));
  const seg = segmentOfContent(s);
  const t = Math.max(0, Math.min((s.topics?.length ?? 1) - 1, Number((await searchParams).t ?? 0) || 0));
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Link href={`/learn${seg ? `?segment=${seg}` : ""}`} className="text-sm text-ink-2">← {c.back}</Link>
      <h1 className="mt-2 font-display text-3xl">{s.title[lang]}</h1>
      {a.open ? (
        <>
          <p className="mt-1 text-sm font-semibold text-leaf">{a.via === "teacher" ? c.via.teacher(a.teacherName ?? null) : a.via === "subscription" ? c.via.subscription : c.via.staff}</p>
          <SheetView href={s.href} topics={s.topics ?? []} start={t} labels={{ topics: p.topics, full: p.full, print: p.print }} />
        </>
      ) : (
        <div className="card mt-6 max-w-xl p-6">
          <p className="font-semibold">🔒 {c.locked}</p>
          <p className="mt-2 text-sm text-ink-2">{store ? c.lockedWhyStore : c.lockedWhy}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/teachers" className="btn-board px-4! py-2!">{c.freeHow}</Link>
            {seg && !store && <Link href={`/learn/buy/${seg}`} className="btn-ghost px-4! py-2!">{c.unlock}</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
