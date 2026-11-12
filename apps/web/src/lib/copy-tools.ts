/**
 * Copy for class tools (files, recordings, exams) and the tutor panel.
 * Same voice rules as copy.ts: Bangla first, English carries the same joke.
 */
import type { Lang } from "@mastermoshai/core";
import { L } from "./l10n";

const n = (x: number | string) => L.num(x, "bn");

const bn = {
  tabs: { files: "ক্লাসের ফাইল", recordings: "রেকর্ডিং", exams: "পরীক্ষা" },
  off: "এই অংশটা চালু হবে Supabase-এর চাবি বসানোর পর।",
  loading: "খাতা খুলছি...",
  error: "কিছু একটা গোলমাল হলো। পেজটা রিফ্রেশ করে দেখো।",
  files: {
    empty: "এই ক্লাসে এখনো কোনো ফাইল নেই।",
    emptyTeacher: "স্লাইড, শিট বা নোট থাকলে এখানে তুলে দিন। ছাত্ররা সাথে সাথে পেয়ে যাবে।",
    upload: "ফাইল তুলি (PDF, PPT...)", uploading: (p: number) => `তুলছি... ${n(p)}%`,
    bad: "এই ধরনের ফাইল চলবে না। PDF, PPT, Word, Excel, ছবি বা ZIP দিন, ১০০ MB-র মধ্যে।",
    open: "খুলি", remove: "সরাই",
  },
  rec: {
    empty: "এখনো কোনো রেকর্ডিং নেই। ক্লাস শেষ হওয়ার কয়েক মিনিট পর এখানে চলে আসে।",
    note: "ক্লাস মিস করেছ? কোনো চিন্তা নেই, পুরো ক্লাসটা এখানে আছে।",
    recording: "রেকর্ড হচ্ছে",
  },
  exams: {
    empty: "এখনো কোনো পরীক্ষা নেই। আপাতত হাঁফ ছেড়ে বাঁচো!",
    emptyTeacher: "ক্লাসের পর একটা ছোট পরীক্ষা নিলে পড়াটা মাথায় বসে যায়।",
    create: "নতুন পরীক্ষা বানাই",
    meta: (q: number, m: number, d: number | null) => `${n(q)}টি প্রশ্ন · পূর্ণমান ${n(m)}${d ? ` · ${n(d)} মিনিট` : ""}`,
    draft: "খসড়া", published: "ছাত্রদের দেখানো হচ্ছে",
    submitted: (s: number, c: number) => `${n(s)} জন জমা দিয়েছে${c ? ` · ${n(c)}টি খাতা দেখা বাকি` : ""}`,
    take: "পরীক্ষা দিই", result: (t: number, m: number) => `পেয়েছ ${n(t)} / ${n(m)}`, pending: "লিখিত অংশ দেখা বাকি",
    check: "খাতা দেখি", publish: "ছাত্রদের দেখাই", unpublish: "লুকিয়ে রাখি",
    kinds: { mcq: "MCQ", written: "লিখিত" } as Record<string, string>,
  },
  builder: {
    h: "নতুন পরীক্ষা", title: "পরীক্ষার নাম", titlePh: "যেমন: গতি অধ্যায়, ক্লাস টেস্ট ১",
    instr: "নির্দেশনা (ঐচ্ছিক)", instrPh: "যেমন: সব প্রশ্নের উত্তর দাও। ক্যালকুলেটর চলবে।",
    duration: "সময় (মিনিট, ঐচ্ছিক)",
    addMcq: "+ MCQ প্রশ্ন", addWritten: "+ লিখিত প্রশ্ন",
    q: (i: number) => `প্রশ্ন ${n(i)}`, prompt: "প্রশ্ন", marks: "নম্বর", options: "অপশন", correct: "ঠিক উত্তরে টিক দিন",
    addOpt: "+ অপশন", remove: "মুছি", up: "↑", down: "↓",
    total: (m: number) => `পূর্ণমান: ${n(m)}`,
    save: "খসড়া রাখি", savePublish: "বানিয়ে ছাত্রদের দেখাই", saving: "রাখছি...",
    errors: "লাল দাগ দেওয়া জায়গাগুলো ঠিক করুন: প্রশ্ন খালি, নম্বর নেই, বা MCQ-তে ঠিক উত্তর বাছা হয়নি।",
    back: "← ক্লাসে ফিরি",
  },
  take: {
    left: "সময় বাকি", submit: "খাতা জমা দিই", submitting: "জমা দিচ্ছি...",
    confirm: (a: number, t: number) => `${n(t)}টির মধ্যে ${n(a)}টির উত্তর দিয়েছ। জমা দিলে আর বদলানো যাবে না।`,
    sure: "হ্যাঁ, জমা দিই", wait: "আরেকটু দেখি",
    timeUp: "সময় শেষ! খাতা নিজে থেকেই জমা হয়ে গেছে।",
    writePh: "উত্তর এখানে লেখো...",
    done: "খাতা জমা হয়েছে!", mcqScore: (a: number) => `MCQ-তে পেয়েছ ${n(a)}`,
    waitWritten: "লিখিত অংশ টিচার দেখে নম্বর দেবেন। দেওয়া হলেই এখানে দেখাবে।",
    final: (t: number, m: number) => `মোট ${n(t)} / ${n(m)}`,
    yours: "তোমার উত্তর", right: "ঠিক উত্তর", marksGot: (g: number, m: number) => `${n(g)} / ${n(m)}`, noAnswer: "উত্তর দাওনি",
    already: "এই পরীক্ষা তুমি আগেই দিয়েছ।",
  },
  grade: {
    h: "খাতা দেখা", none: "এখনো কেউ খাতা জমা দেয়নি।", paper: "প্রশ্নপত্র",
    auto: (a: number) => `MCQ: ${n(a)} (নিজে থেকে)`, total: (t: number, m: number) => `মোট: ${n(t)} / ${n(m)}`,
    checked: "দেখা শেষ", todo: "দেখা বাকি", save: "নম্বর রাখি", saved: "রাখা হয়েছে ✓",
    outOf: (m: number) => `/ ${n(m)}`,
  },
} ;

type ToolsCopy = typeof bn;

const en: ToolsCopy = {
  tabs: { files: "Class files", recordings: "Recordings", exams: "Exams" },
  off: "This part switches on once the Supabase keys are added.",
  loading: "Opening the register...",
  error: "Something went wrong. Refresh the page and try again.",
  files: {
    empty: "No files for this class yet.",
    emptyTeacher: "Got slides, sheets or notes? Drop them here and students get them instantly.",
    upload: "Upload a file (PDF, PPT...)", uploading: (p) => `Uploading... ${p}%`,
    bad: "That file type won't work. Use PDF, PPT, Word, Excel, an image or ZIP, under 100 MB.",
    open: "Open", remove: "Remove",
  },
  rec: {
    empty: "No recordings yet. They show up a few minutes after a class ends.",
    note: "Missed the class? No stress, the whole thing is right here.",
    recording: "Recording",
  },
  exams: {
    empty: "No exams yet. Enjoy it while it lasts!",
    emptyTeacher: "A short test after class makes the lesson stick.",
    create: "Create an exam",
    meta: (q, m, d) => `${q} questions · ${m} marks${d ? ` · ${d} min` : ""}`,
    draft: "Draft", published: "Visible to students",
    submitted: (s, c) => `${s} submitted${c ? ` · ${c} to check` : ""}`,
    take: "Take the exam", result: (t, m) => `You got ${t} / ${m}`, pending: "Written part not checked yet",
    check: "Check scripts", publish: "Show to students", unpublish: "Hide",
    kinds: { mcq: "MCQ", written: "Written" },
  },
  builder: {
    h: "New exam", title: "Exam title", titlePh: "e.g. Motion chapter, class test 1",
    instr: "Instructions (optional)", instrPh: "e.g. Answer every question. Calculators allowed.",
    duration: "Time limit (minutes, optional)",
    addMcq: "+ MCQ question", addWritten: "+ Written question",
    q: (i) => `Question ${i}`, prompt: "Question", marks: "Marks", options: "Options", correct: "Tick the right answer",
    addOpt: "+ Option", remove: "Delete", up: "↑", down: "↓",
    total: (m) => `Total marks: ${m}`,
    save: "Save as draft", savePublish: "Create and show to students", saving: "Saving...",
    errors: "Fix the parts marked in red: empty question, no marks, or no right answer picked for an MCQ.",
    back: "← Back to class",
  },
  take: {
    left: "Time left", submit: "Hand in my script", submitting: "Handing in...",
    confirm: (a, t) => `You answered ${a} of ${t}. Once handed in, it can't be changed.`,
    sure: "Yes, hand it in", wait: "Let me check again",
    timeUp: "Time's up! Your script was handed in automatically.",
    writePh: "Write your answer here...",
    done: "Script handed in!", mcqScore: (a) => `MCQ score: ${a}`,
    waitWritten: "Your tutor will mark the written part. Your marks show up here as soon as they do.",
    final: (t, m) => `Total ${t} / ${m}`,
    yours: "Your answer", right: "Right answer", marksGot: (g, m) => `${g} / ${m}`, noAnswer: "Not answered",
    already: "You have already taken this exam.",
  },
  grade: {
    h: "Checking scripts", none: "Nobody has handed in yet.", paper: "Question paper",
    auto: (a) => `MCQ: ${a} (auto)`, total: (t, m) => `Total: ${t} / ${m}`,
    checked: "Checked", todo: "To check", save: "Save marks", saved: "Saved ✓",
    outOf: (m) => `/ ${m}`,
  },
};

export const toolsCopy = (lang: Lang): ToolsCopy => (lang === "en" ? en : bn);
