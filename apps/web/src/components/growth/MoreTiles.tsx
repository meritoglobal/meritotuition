import Link from "next/link";
import type { Lang } from "@mastermoshai/core";
import { growthCopy } from "@/lib/copy-growth";

const ICON: Record<string, string> = { parent: "👨‍👩‍👧", chat: "💬", packages: "📅", refer: "🎁", leaderboard: "🏆", ask: "📷" };

/** Shortcuts to the newer features, for dashboards. */
export function MoreTiles({ lang, unread = 0 }: { lang: Lang; unread?: number }) {
  const c = growthCopy(lang).more;
  const items = [["/ask", "ask"], ["/leaderboard", "leaderboard"], ["/packages", "packages"], ["/chat", "chat"], ["/parent", "parent"], ["/refer", "refer"]] as const;
  return (
    <section className="mt-6">
      <h2 className="font-display text-2xl">{c.h}</h2>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {items.map(([href, k]) => (
          <Link key={k} href={href} className="card relative flex flex-col items-center gap-1 p-3 text-center text-sm font-semibold hover:border-ink-3">
            <span className="text-2xl" aria-hidden>{ICON[k]}</span>{c[k]}
            {k === "chat" && unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-redpen" />}
          </Link>
        ))}
      </div>
    </section>
  );
}
