/**
 * Platform content (lecture sheets, slides, question sets). Files live in
 * apps/web/content/sheets/ (NOT public): they are served by /api/content/{id}
 * only to tutors, students of a tutor in that subject+class, and segment subscribers.
 * The content team adds a line here for each new sheet.
 * subject/level use the same codes as @mastermoshai/core SUBJECTS / CLASS_LEVELS.
 */
export interface ContentItem {
  id: string;
  kind: "sheet" | "slides" | "questions";
  subject: string;
  level: string;
  chapter: number;
  /** CLASS_6 / CLASS_7 / CLASS_8 for Class 6-8 content (its level alone cannot say which class). */
  segment?: "CLASS_6" | "CLASS_7" | "CLASS_8" | "SSC" | "HSC";
  title: { bn: string; en: string };
  /** File name under apps/web/content/sheets/. */
  file: string;
  /** Where to open it (access-checked). */
  href: string;
  /** Topics in page order; topic i is the sheet's i-th `.part-head` block (used by class preparation). */
  topics?: { no: string; title: string }[];
}

export const CONTENT: ContentItem[] = [
  {
    id: "c9-physics-ch2-motion", kind: "sheet", subject: "Physics", level: "CLASS_9_10", chapter: 2,
    title: { bn: "অধ্যায় ২: গতি (লেকচার শিট, MCQ, সৃজনশীল, টিচার নোট)", en: "Chapter 2: Motion (lecture sheet, MCQ, CQ, tutor notes)" },
    file: "c9-physics-ch2-motion.html",
    href: "/api/content/c9-physics-ch2-motion",
    topics: [
      { no: "২.১", title: "স্থিতি আর গতি: \"কার সাপেক্ষে?\"" },
      { no: "২.২", title: "গতির রকমফের" },
      { no: "২.৩", title: "স্কেলার আর ভেক্টর" },
      { no: "২.৪", title: "দূরত্ব আর সরণ" },
      { no: "২.৫", title: "দ্রুতি আর বেগ" },
      { no: "২.৬", title: "ত্বরণ: বেগ কত দ্রুত বদলায়" },
      { no: "২.৭", title: "গতির চার সমীকরণ" },
      { no: "২.৮", title: "পড়ন্ত বস্তু" },
      { no: "নিজে করো", title: "গ্রাফ পড়ে গতির গল্প বোঝা" },
      { no: "অনুশীলনী", title: "নিজে যাচাই করো (MCQ, সৃজনশীল)" },
      { no: "এক নজরে", title: "পুরো অধ্যায় এক পাতায়, ক্লাস প্ল্যান, টিচার নোট" },
    ],
  },
];

export const contentFor = (subject?: string, level?: string) =>
  CONTENT.filter((c) => (!subject || c.subject === subject) && (!level || c.level === level));
