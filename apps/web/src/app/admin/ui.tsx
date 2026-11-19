import Link from "next/link";
import type { ReactNode } from "react";

/** Small building blocks shared by the admin pages. Server components only. */

export const tx = (lang: string) => (bn: string, en: string) => (lang === "en" ? en : bn);

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-line pb-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-2">{sub}</p>}
      </div>
      {children && <div className="ml-auto flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, href, alert }: { label: string; value: ReactNode; href?: string; alert?: boolean }) {
  const body = (
    <>
      <div className="text-xs text-ink-3">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${alert ? "text-redpen" : ""}`}>{value}</div>
    </>
  );
  return href
    ? <Link href={href} className="card block p-4 hover:border-ink-3">{body}</Link>
    : <div className="card p-4">{body}</div>;
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {right && <div className="ml-auto text-sm">{right}</div>}
      </div>
      {children}
    </section>
  );
}

const TONES: Record<string, string> = {
  ok: "bg-home text-home-ink",
  warn: "bg-gold-tint text-ink",
  bad: "bg-redpen-tint text-redpen",
  info: "bg-online text-online-ink",
  mute: "bg-mist text-ink-2",
};
export function Pill({ tone = "mute", children }: { tone?: keyof typeof TONES | string; children: ReactNode }) {
  return <span className={`tag ${TONES[tone] ?? TONES.mute}`}>{children}</span>;
}

/** Status word → colour. */
export function statusTone(s: string): string {
  if (["PAID", "ACTIVE", "APPROVED", "RELEASED", "DONE", "MATCHED", "ACCEPTED", "ANSWERED", "OPEN_OK"].includes(s)) return "ok";
  if (["PENDING", "QUEUED", "SENDING", "REVIEW", "OPEN", "CREATED", "CLAIMED", "WAITING_PAYMENT", "AI"].includes(s)) return "warn";
  if (["FAILED", "REJECTED", "CANCELLED", "PAST_DUE", "EMPTY", "HELD_BACK", "REFUNDED", "EXPIRED", "DECLINED"].includes(s)) return "bad";
  return "mute";
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string | false }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="border-b border-line bg-mist text-xs text-ink-3">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="px-3 py-6 text-center text-sm text-ink-3">{empty}</p>}
    </div>
  );
}
export const Td = ({ children, className = "" }: { children?: ReactNode; className?: string }) => <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;

export function SearchBox({ action, q, placeholder, children }: { action: string; q?: string; placeholder: string; children?: ReactNode }) {
  return (
    <form action={action} className="mt-4 flex flex-wrap gap-2">
      <input name="q" defaultValue={q} placeholder={placeholder} className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
      {children}
      <button className="btn-board px-4! py-2! text-sm">{"→"}</button>
    </form>
  );
}

export function Tabs({ base, tabs, active }: { base: string; tabs: [string, string][]; active: string }) {
  return (
    <div className="mt-4 flex flex-wrap gap-1 border-b border-line">
      {tabs.map(([k, label]) => (
        <Link key={k} href={`${base}?tab=${k}`} className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${k === active ? "border-board text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>{label}</Link>
      ))}
    </div>
  );
}

export const input = "rounded-lg border border-line px-2 py-1 text-sm";
export const smallBtn = "btn-board px-3! py-1! text-sm";
export const ghostBtn = "btn-ghost px-3! py-1! text-sm";
export const dangerBtn = "btn px-3! py-1! text-sm border-redpen text-redpen hover:bg-redpen-tint";

export const short = (s: string | null | undefined, n = 80) => (!s ? "" : s.length > n ? `${s.slice(0, n)}…` : s);
