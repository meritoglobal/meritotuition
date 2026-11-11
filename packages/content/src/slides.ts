/**
 * Turn a lecture sheet into a slide deck the teacher can present inside the
 * live class (screen share) or download. One idea per slide.
 */
import type { LectureSheetBody } from './lecture-sheet';

export type Slide =
  | { layout: 'title'; title: string; subtitle: string }
  | { layout: 'bullets'; title: string; bullets: string[] }
  | { layout: 'statement'; title: string; text: string; tone?: 'info' | 'tip' | 'warn' }
  | { layout: 'formula'; title: string; tex: string; note?: string }
  | { layout: 'steps'; title: string; problem: string; steps: string[] }
  | { layout: 'table'; title: string; head: string[]; rows: string[][] }
  | { layout: 'question'; title: string; prompt: string };

const MAX_BULLETS = 5;

function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

/** Split long prose into slide-sized sentences. */
function toBullets(text: string): string[] {
  return text.split(/(?<=[।.?!])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

export function sheetToSlides(s: LectureSheetBody): Slide[] {
  const slides: Slide[] = [{ layout: 'title', title: s.topic, subtitle: `অধ্যায় ${s.chapter.number}: ${s.chapter.title}` }];
  for (const b of s.blocks) {
    switch (b.kind) {
      case 'objectives': slides.push({ layout: 'bullets', title: 'আজ আমরা শিখব', bullets: b.items.slice(0, MAX_BULLETS) }); break;
      case 'warmup': slides.push({ layout: 'question', title: 'চলো ভাবি', prompt: b.text }); break;
      case 'concept':
        chunk(toBullets(b.text), MAX_BULLETS).forEach((part, i) =>
          slides.push({ layout: 'bullets', title: i ? `${b.heading} (চলবে)` : b.heading, bullets: part }));
        break;
      case 'definition': slides.push({ layout: 'statement', title: b.term, text: b.text }); break;
      case 'formula': slides.push({ layout: 'formula', title: b.label, tex: b.tex, note: b.note }); break;
      case 'example':
        // Problem first so students try it, then the worked steps.
        slides.push({ layout: 'question', title: b.title ?? 'উদাহরণ', prompt: b.problem });
        slides.push({ layout: 'steps', title: `${b.title ?? 'উদাহরণ'}: সমাধান`, problem: b.problem, steps: b.solution });
        break;
      case 'table': slides.push({ layout: 'table', title: b.caption ?? 'তুলনা', head: b.head, rows: b.rows }); break;
      case 'tip': slides.push({ layout: 'statement', title: 'মনে রাখার কৌশল', text: b.text, tone: 'tip' }); break;
      case 'mistake': slides.push({ layout: 'statement', title: 'সাবধান!', text: b.text, tone: 'warn' }); break;
      case 'summary': slides.push({ layout: 'bullets', title: 'এক নজরে', bullets: b.items.slice(0, MAX_BULLETS + 1) }); break;
      case 'homework': slides.push({ layout: 'bullets', title: 'বাড়ির কাজ', bullets: b.items }); break;
      default: break; // diagrams and practice are shown from the sheet/exam tools
    }
  }
  for (const q of s.teacherNotes.checkQuestions.slice(0, 2)) slides.push({ layout: 'question', title: 'বুঝেছ কিনা দেখি', prompt: q });
  return slides;
}
