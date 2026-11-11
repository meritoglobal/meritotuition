/**
 * Bangla labels for shared data. Bangla is the default language on web and app;
 * English is the toggle. Keep keys identical to the English enums in types.ts.
 */
import type { ClassLevel, Subject, Weekday } from "./types";

export type Lang = "bn" | "en";
export const DEFAULT_LANG: Lang = "bn";

export const CLASS_LEVEL_LABEL_BN: Record<ClassLevel, string> = {
  CLASS_1_5: "১ম-৫ম শ্রেণি",
  CLASS_6_8: "৬ষ্ঠ-৮ম শ্রেণি",
  CLASS_9_10: "৯ম-১০ম শ্রেণি",
  SSC: "এসএসসি",
  CLASS_11_12: "একাদশ-দ্বাদশ",
  HSC: "এইচএসসি",
  O_LEVEL: "ও লেভেল",
  A_LEVEL: "এ লেভেল",
  ADMISSION: "ভর্তি প্রস্তুতি",
};

export const SUBJECT_LABEL_BN: Record<Subject, string> = {
  Math: "গণিত",
  "Higher Math": "উচ্চতর গণিত",
  Physics: "পদার্থবিজ্ঞান",
  Chemistry: "রসায়ন",
  Biology: "জীববিজ্ঞান",
  English: "ইংরেজি",
  Bangla: "বাংলা",
  ICT: "আইসিটি",
  Accounting: "হিসাববিজ্ঞান",
  Economics: "অর্থনীতি",
};

export const AREA_LABEL_BN: Record<string, string> = {
  Farmgate: "ফার্মগেট",
  Dhanmondi: "ধানমন্ডি",
  Mirpur: "মিরপুর",
  Mohammadpur: "মোহাম্মদপুর",
  Uttara: "উত্তরা",
  Mohakhali: "মহাখালী",
  Badda: "বাড্ডা",
  "Azimpur / Lalbagh": "আজিমপুর / লালবাগ",
};

export const UNIVERSITY_LABEL_BN: Record<string, string> = {
  BUET: "বুয়েট",
  "University of Dhaka": "ঢাকা বিশ্ববিদ্যালয়",
  "North South University": "নর্থ সাউথ ইউনিভার্সিটি",
  "Jahangirnagar University": "জাহাঙ্গীরনগর বিশ্ববিদ্যালয়",
};

export const WEEKDAY_SHORT_BN: Record<Weekday, string> = {
  0: "রবি",
  1: "সোম",
  2: "মঙ্গল",
  3: "বুধ",
  4: "বৃহঃ",
  5: "শুক্র",
  6: "শনি",
};

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Replace ASCII digits with Bangla digits. */
export function bnDigits(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

/** 3000 -> "৩,০০০" (bn) or "3,000" (en), Indian grouping. */
export function formatNumber(n: number, lang: Lang): string {
  const s = n.toLocaleString("en-IN");
  return lang === "bn" ? bnDigits(s) : s;
}

export function formatTakaL(n: number, lang: Lang): string {
  return `৳${formatNumber(n, lang)}`;
}

/** "17:30" -> "বিকাল ৫:৩০" (bn) or "5:30 PM" (en). */
export function timeLabelL(hhmm: string, lang: Lang): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");
  if (lang === "en") return `${h12}:${mm} ${h >= 12 ? "PM" : "AM"}`;
  const part = h < 4 ? "রাত" : h < 12 ? "সকাল" : h < 15 ? "দুপুর" : h < 18 ? "বিকাল" : h < 20 ? "সন্ধ্যা" : "রাত";
  return `${part} ${bnDigits(`${h12}:${mm}`)}`;
}
