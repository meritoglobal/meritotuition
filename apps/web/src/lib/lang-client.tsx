"use client";
import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@mastermoshai/core";
import { LANG_COOKIE } from "./l10n";

const Ctx = createContext<Lang>("bn");
export const useLang = () => useContext(Ctx);

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

/** বাং / EN switch. Remembers the choice for a year. */
export function LangToggle() {
  const lang = useLang();
  const router = useRouter();
  const set = (l: Lang) => {
    if (l === lang) return;
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="flex rounded-lg border-2 border-line p-0.5 text-xs font-semibold" role="group" aria-label="ভাষা / Language">
      {(["bn", "en"] as const).map((l) => (
        <button key={l} onClick={() => set(l)} aria-pressed={lang === l} className={`rounded-md px-2 py-1 ${lang === l ? "bg-ink text-white" : "text-ink-2 hover:text-ink"}`}>
          {l === "bn" ? "বাং" : "EN"}
        </button>
      ))}
    </div>
  );
}
