/**
 * Lecture sheet format. One sheet = one topic = roughly one class.
 * Stored as structured blocks so the same sheet renders to the web reader,
 * a printable PDF (A4), and a slide deck, and so teachers can fork and edit.
 */

export type Block =
  | { kind: 'objectives'; items: string[] }            // শিখনফল
  | { kind: 'warmup'; text: string }                    // আগের পড়ার সাথে সংযোগ / প্রশ্ন দিয়ে শুরু
  | { kind: 'concept'; heading: string; text: string } // মূল আলোচনা
  | { kind: 'definition'; term: string; text: string }
  | { kind: 'formula'; label: string; tex: string; note?: string }
  | { kind: 'example'; title?: string; problem: string; solution: string[] } // সমাধানকৃত উদাহরণ (ধাপে ধাপে)
  | { kind: 'table'; caption?: string; head: string[]; rows: string[][] }
  | { kind: 'tip'; text: string }                       // মনে রাখার কৌশল / শর্টকাট
  | { kind: 'mistake'; text: string }                   // সাধারণ ভুল
  | { kind: 'diagram'; caption: string; svg?: string; imageUrl?: string }
  | { kind: 'practice'; questionIds: string[] }         // pulled from the bank at render time
  | { kind: 'homework'; items: string[] }
  | { kind: 'summary'; items: string[] };               // এক নজরে

export interface TeacherNotes {
  /** Suggested time split for a 60-min class. */
  timeline: { minutes: number; activity: string }[];
  /** Questions to ask students during class to check understanding. */
  checkQuestions: string[];
  /** Where students usually get stuck and how to unblock them. */
  pitfalls: string[];
}

export interface LectureSheetBody {
  trackCode: string;
  subjectCode: string;
  chapter: { number: number; title: string };
  topic: string;
  medium: 'BANGLA' | 'ENGLISH_VERSION';
  /** Short reference to the NCTB textbook section this follows, never copied text. */
  syllabusRef?: string;
  blocks: Block[];
  teacherNotes: TeacherNotes;
}

/** Minimum quality bar a sheet must pass before review. */
export function validateSheet(s: LectureSheetBody): string[] {
  const errs: string[] = [];
  const has = (k: Block['kind']) => s.blocks.some((b) => b.kind === k);
  if (!has('objectives')) errs.push('শিখনফল (objectives) নেই');
  if (!s.blocks.some((b) => b.kind === 'concept')) errs.push('মূল আলোচনা (concept) নেই');
  if (!has('summary')) errs.push('সারসংক্ষেপ (summary) নেই');
  if (!has('example') && !has('definition')) errs.push('অন্তত একটি উদাহরণ বা সংজ্ঞা দরকার');
  if (s.teacherNotes.timeline.reduce((m, t) => m + t.minutes, 0) <= 0) errs.push('টিচার টাইমলাইন ফাঁকা');
  return errs;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Render to standalone printable HTML (A4). PDF = print this page. */
export function renderSheetHtml(s: LectureSheetBody, opts: { brand?: string; teacherName?: string; withTeacherNotes?: boolean } = {}): string {
  const brand = opts.brand ?? 'Merito Tuition';
  const b = s.blocks.map(renderBlock).join('\n');
  const notes = opts.withTeacherNotes
    ? `<section class="notes"><h2>টিচার নোট</h2>
<h3>ক্লাস টাইমলাইন</h3><ol>${s.teacherNotes.timeline.map((t) => `<li><b>${t.minutes} মিনিট:</b> ${esc(t.activity)}</li>`).join('')}</ol>
<h3>ক্লাসে জিজ্ঞেস করার প্রশ্ন</h3><ul>${s.teacherNotes.checkQuestions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>
<h3>যেখানে শিক্ষার্থীরা আটকায়</h3><ul>${s.teacherNotes.pitfalls.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></section>`
    : '';
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.topic)} · ${esc(brand)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap">
<style>
:root{--ink:#1d2433;--muted:#5b6475;--line:#e3e6ec;--accent:#2f5bea;--soft:#f3f6ff;--warn:#fff6e5;--bad:#fdecec}
body{font-family:'Hind Siliguri',system-ui,sans-serif;color:var(--ink);background:#fff;margin:0;line-height:1.65}
.page{max-width:820px;margin:0 auto;padding:28px 20px}
header{border-bottom:3px solid var(--accent);padding-bottom:10px;margin-bottom:18px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
header .meta{color:var(--muted);font-size:14px}
h1{font-size:26px;margin:4px 0}
h2{font-size:19px;border-left:4px solid var(--accent);padding-left:8px;margin-top:26px}
.box{border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin:12px 0}
.def{background:var(--soft)} .tip{background:#eefaf1} .mistake{background:var(--bad)} .warm{background:var(--warn)}
.formula{font-family:'Cambria Math','Times New Roman',serif;font-size:18px;text-align:center;background:var(--soft)}
table{border-collapse:collapse;width:100%;margin:10px 0}td,th{border:1px solid var(--line);padding:6px 8px;text-align:left}th{background:var(--soft)}
.ex .sol{margin:6px 0 0 0;padding-left:20px}
.notes{border-top:2px dashed var(--line);margin-top:30px}
footer{margin-top:30px;color:var(--muted);font-size:12px;text-align:center}
@media print{.page{padding:0}h2{break-after:avoid}.box{break-inside:avoid}}
</style></head><body><div class="page">
<header><div><div class="meta">${esc(s.trackCode)} · ${esc(s.subjectCode)} · অধ্যায় ${s.chapter.number}: ${esc(s.chapter.title)}</div><h1>${esc(s.topic)}</h1></div>
<div class="meta">${esc(brand)}${opts.teacherName ? `<br>শিক্ষক: ${esc(opts.teacherName)}` : ''}</div></header>
${b}
${notes}
<footer>${esc(brand)} লেকচার শিট${s.syllabusRef ? ` · ${esc(s.syllabusRef)}` : ''}</footer>
</div></body></html>`;
}

function renderBlock(b: Block): string {
  switch (b.kind) {
    case 'objectives': return `<h2>শিখনফল</h2><p>এই ক্লাস শেষে শিক্ষার্থীরা পারবে:</p><ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
    case 'warmup': return `<div class="box warm"><b>শুরুর প্রশ্ন:</b> ${esc(b.text)}</div>`;
    case 'concept': return `<h2>${esc(b.heading)}</h2><p>${esc(b.text).replace(/\n/g, '<br>')}</p>`;
    case 'definition': return `<div class="box def"><b>${esc(b.term)}:</b> ${esc(b.text)}</div>`;
    case 'formula': return `<div class="box formula">${esc(b.tex)}<div style="font-size:13px;font-family:inherit;color:var(--muted)">${esc(b.label)}${b.note ? ` · ${esc(b.note)}` : ''}</div></div>`;
    case 'example': return `<div class="box ex"><b>${esc(b.title ?? 'উদাহরণ')}:</b> ${esc(b.problem)}<ol class="sol">${b.solution.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>`;
    case 'table': return `${b.caption ? `<p><b>${esc(b.caption)}</b></p>` : ''}<table><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
    case 'tip': return `<div class="box tip"><b>মনে রাখার কৌশল:</b> ${esc(b.text)}</div>`;
    case 'mistake': return `<div class="box mistake"><b>সাধারণ ভুল:</b> ${esc(b.text)}</div>`;
    case 'diagram': return `<figure class="box">${b.svg ?? (b.imageUrl ? `<img src="${esc(b.imageUrl)}" alt="${esc(b.caption)}" style="max-width:100%">` : '')}<figcaption>${esc(b.caption)}</figcaption></figure>`;
    case 'practice': return `<h2>অনুশীলনী</h2><p data-practice="${b.questionIds.join(',')}">(প্রশ্নব্যাংক থেকে ${b.questionIds.length}টি প্রশ্ন)</p>`;
    case 'homework': return `<h2>বাড়ির কাজ</h2><ol>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`;
    case 'summary': return `<h2>এক নজরে</h2><ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  }
}
