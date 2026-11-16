import Link from "next/link";
import { Off } from "@/components/growth/Off";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { threads } from "@/lib/growth/chat";
import { mustMe } from "@/lib/growth/page";

export const dynamic = "force-dynamic";

export default async function ChatList({ searchParams }: { searchParams: Promise<{ no?: string }> }) {
  const m = await mustMe("/chat");
  const lang = await getLang();
  const c = growthCopy(lang);
  if (!DATA_LIVE) return <div className="mx-auto max-w-3xl px-5 py-10"><h1 className="font-display text-4xl">{c.chat.h1}</h1><Off text={c.off} /></div>;
  const list = await threads(m.email);
  const { no } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="font-display text-4xl">{c.chat.h1}</h1>
      {no && <p className="mt-4 rounded-lg bg-redpen-tint p-3 text-sm text-redpen">{c.chat.no}</p>}
      {list.length === 0 ? <p className="mt-6 text-sm text-ink-3">{c.chat.empty}</p> : (
        <ul className="card mt-6 divide-y divide-line">
          {list.map((t) => (
            <li key={t.id}>
              <Link href={`/chat/${t.id}`} className="flex items-center gap-3 p-4 hover:bg-mist">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-board font-bold text-white">{t.otherName.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${t.unread ? "font-bold" : "font-semibold"}`}>{t.otherName}</span>
                  <span className={`block truncate text-sm ${t.unread ? "text-ink" : "text-ink-3"}`}>{t.lastText ?? "…"}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-3">{L.date(new Date(t.lastAt), lang)}</span>
                {t.unread && <span className="h-2.5 w-2.5 rounded-full bg-redpen" aria-label="unread" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-ink-3">{c.chat.rule}</p>
    </div>
  );
}
