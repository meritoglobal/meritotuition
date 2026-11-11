import { cookies } from "next/headers";
import { DEFAULT_LANG, type Lang } from "@mastermoshai/core";
import { LANG_COOKIE } from "./l10n";

/** Bangla unless the visitor has switched to English with the toggle. */
export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return v === "en" || v === "bn" ? v : DEFAULT_LANG;
}
