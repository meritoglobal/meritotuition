import Link from "next/link";
import type { Lang } from "@mastermoshai/core";
import { growthCopy } from "@/lib/copy-growth";
import { marketCopy } from "@/lib/copy-market";
import { bizCopy } from "@/lib/copy-biz";

const ICON: Record<string, string> = { learn: "📘", routine: "🗓️", requests: "🔎", parent: "👨‍👩‍👧", chat: "💬", packages: "📅", refer: "🎁", leaderboard: "🏆", ask: "📷" };

/** Shortcuts to the newer features, for dashboards. */
export function MoreTiles({ lang, unread = 0, routine = 0 }: { lang: Lang; unread?: number; routine?: number }) {
  const b = bizCopy(lang).nav;
  const c = { ...growthCopy(lang).more, requests: marketCopy(lang).req.tile, learn: b.learn, routine: b.routine };
  const items = [["/learn", "learn"], ["/requests", "requests"], ["/ask", "ask"], ["/leaderboard", "leaderboard"], ["/packages", "packages"], ["/chat", "chat"], ["/parent", "parent"], ["/refer", "refer"], ["/routine", "routine"]] as const;
  return (
    <section className="mt-6">
      <h2 className="font-display text-2xl">{c.h}</h2>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {items.map(([href, k]) => (
          <Link key={k} href={href} className="card relative flex flex-col items-center gap-1 p-3 text-center text-sm font-semibold hover:border-ink-3">
            <span className="text-2xl" aria-hidden>{ICON[k]}</span>{c[k]}
            {((k === "chat" && unread > 0) || (k === "routine" && routine > 0)) && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-redpen" />}
          </Link>
        ))}
      </div>
    </section>
  );
}
