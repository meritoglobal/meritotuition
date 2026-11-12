/**
 * Platform content a tutor can download for a batch. Files live in
 * public/content/; the content team adds a line here for each new sheet.
 * subject/level use the same codes as @mastermoshai/core SUBJECTS / CLASS_LEVELS.
 */
export interface ContentItem {
  id: string;
  kind: "sheet" | "slides" | "questions";
  subject: string;
  level: string;
  chapter: number;
  title: { bn: string; en: string };
  href: string;
}

export const CONTENT: ContentItem[] = [
  {
    id: "c9-physics-ch2-motion", kind: "sheet", subject: "Physics", level: "CLASS_9_10", chapter: 2,
    title: { bn: "অধ্যায় ২: গতি (লেকচার শিট, MCQ, সৃজনশীল, টিচার নোট)", en: "Chapter 2: Motion (lecture sheet, MCQ, CQ, tutor notes)" },
    href: "/content/sheets/c9-physics-ch2-motion.html",
  },
];

export const contentFor = (subject?: string, level?: string) =>
  CONTENT.filter((c) => (!subject || c.subject === subject) && (!level || c.level === level));
