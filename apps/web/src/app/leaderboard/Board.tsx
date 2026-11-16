import type { Lang } from "@mastermoshai/core";
import { growthCopy } from "@/lib/copy-growth";
import { L } from "@/lib/l10n";
import type { Ranked } from "@/lib/growth/tests";

const MEDAL = ["", "🥇", "🥈", "🥉"];

export function Board({ rows, mine, lang }: { rows: Ranked[]; mine?: Ranked | null; lang: Lang }) {
  const c = growthCopy(lang).test;
  const all = mine && !rows.some((r) => r.me) ? [...rows, mine] : rows;
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-line text-left text-xs text-ink-3"><th className="py-2 pr-2">{c.rank}</th><th className="pr-2">{c.who}</th><th className="pr-2 text-right">{c.score}</th><th className="text-right">{c.time}</th></tr></thead>
      <tbody>
        {all.map((r, i) => (
          <tr key={`${r.rank}-${i}`} className={`border-b border-line/60 ${r.me ? "bg-gold-tint font-semibold" : ""}`}>
            <td className="py-2 pr-2">{MEDAL[r.rank] ?? ""} {L.num(r.rank, lang)}</td>
            <td className="pr-2"><div className="truncate">{r.name}</div>{r.school && <div className="truncate text-xs font-normal text-ink-3">{r.school}</div>}</td>
            <td className="pr-2 text-right">{L.num(r.score, lang)}/{L.num(r.max, lang)}</td>
            <td className="text-right text-ink-2">{c.min(r.timeSec)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
