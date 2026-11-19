"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem { href: string; label: string; badge?: string }

export function AdminNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
      {items.map((it) => {
        const on = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${on ? "bg-board text-white" : "text-ink-2 hover:bg-chalk hover:text-ink"}`}>
            <span>{it.label}</span>
            {it.badge ? <span className={`ml-auto rounded-md px-1.5 text-xs font-bold ${on ? "bg-gold text-ink" : "bg-redpen text-white"}`}>{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
