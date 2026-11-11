/** Language-aware labels for data (subjects, classes, areas, money, time). Safe on server and client. */
import {
  AREA_LABEL_BN, CLASS_LEVEL_LABEL, CLASS_LEVEL_LABEL_BN, SUBJECT_LABEL_BN, UNIVERSITY_LABEL_BN,
  WEEKDAY_LABEL, WEEKDAY_SHORT_BN, bnDigits, formatNumber, formatTakaL, timeLabelL,
  type ClassLevel, type DemoVideo, type Lang, type Subject, type TeacherSummary, type Weekday,
} from "@mastermoshai/core";

export type { Lang };
export const LANG_COOKIE = "mm_lang";

const UNI_SHORT_BN: Record<string, string> = { BUET: "বুয়েট", "University of Dhaka": "ঢাবি", "North South University": "এনএসইউ", "Jahangirnagar University": "জাবি" };
const VIDEO_LEVEL_BN: Record<string, string> = { SSC: "এসএসসি", HSC: "এইচএসসি", "Class 9-10": "৯ম-১০ম", "O Level": "ও লেভেল", "A Level": "এ লেভেল" };

export const L = {
  subject: (s: string, lang: Lang) => (lang === "bn" ? (SUBJECT_LABEL_BN[s as Subject] ?? s) : s),
  subjects: (list: readonly string[], lang: Lang) => list.map((s) => L.subject(s, lang)).join(lang === "bn" ? ", " : ", "),
  level: (l: ClassLevel, lang: Lang) => (lang === "bn" ? CLASS_LEVEL_LABEL_BN[l] : CLASS_LEVEL_LABEL[l]),
  videoLevel: (l: string, lang: Lang) => (lang === "bn" ? (VIDEO_LEVEL_BN[l] ?? l) : l),
  area: (a: string, lang: Lang) => (lang === "bn" ? (AREA_LABEL_BN[a] ?? a) : a),
  uni: (u: string, lang: Lang) => (lang === "bn" ? (UNIVERSITY_LABEL_BN[u] ?? u) : u),
  uniShort: (u: string, lang: Lang) => (lang === "bn" ? (UNI_SHORT_BN[u] ?? u) : u),
  day: (d: Weekday, lang: Lang) => (lang === "bn" ? WEEKDAY_SHORT_BN[d] : WEEKDAY_LABEL[d]),
  name: (t: TeacherSummary, lang: Lang) => (lang === "bn" ? (t.nameBn ?? t.name) : t.name),
  firstName: (t: TeacherSummary, lang: Lang) => L.name(t, lang).split(" ")[0] ?? "",
  bio: (t: TeacherSummary, lang: Lang) => (lang === "bn" ? (t.bioBn ?? t.bio) : t.bio),
  dept: (t: TeacherSummary, lang: Lang) => (lang === "bn" ? (t.departmentBn ?? t.department) : t.department),
  videoTitle: (v: DemoVideo, lang: Lang) => (lang === "bn" ? v.titleBn : v.title),
  num: (n: number | string, lang: Lang) => (lang === "bn" ? bnDigits(n) : String(n)),
  count: (n: number, lang: Lang) => formatNumber(n, lang),
  taka: (n: number, lang: Lang) => formatTakaL(n, lang),
  time: (hhmm: string, lang: Lang) => timeLabelL(hhmm, lang),
  dateTime: (d: Date, lang: Lang) =>
    d.toLocaleString(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
  date: (d: Date, lang: Lang) => d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" }),
};
