/**
 * Demo data for the app screens until the API is wired in. Built from the same
 * fixtures and rules as the website (@mastermoshai/core), so numbers match.
 */
import {
  DEMO_TEACHERS,
  DEMO_VIDEOS,
  SUBJECT_LABEL_BN,
  commissionRate,
  perClassShares,
  settleClass,
  upcomingOccurrences,
  type SessionOutcome,
  type Subject,
  type WeeklySlot,
  type TeacherSummary,
} from "@mastermoshai/core";

export const teachers = DEMO_TEACHERS;
export const videos = DEMO_VIDEOS;
export const teacherById = (id: string): TeacherSummary | undefined => DEMO_TEACHERS.find((t) => t.id === id);

export const subjectBn = (s: string) => SUBJECT_LABEL_BN[s as Subject] ?? s;

/** The student's batch in the demo: Rafiul's Physics batch, same as the website dashboard. */
const rafi = DEMO_TEACHERS[0]!;
const mySlot = rafi.routine[0]!;

export type MyClass = { id: string; start: Date; teacher: TeacherSummary; subject: string; durationMin: number; outcome?: "DONE" | "TEACHER_ABSENT" };

export function myClasses(now = new Date()) {
  const past = upcomingOccurrences(mySlot, new Date(now.getTime() - 9 * 86_400_000), 12).filter((d) => d < now);
  const next = upcomingOccurrences(mySlot, now, 6);
  const mk = (start: Date, i: number, done: boolean): MyClass => ({
    id: `c${i}`,
    start,
    teacher: rafi,
    subject: mySlot.subjects[0]!,
    durationMin: mySlot.durationMin,
    outcome: done ? (i === 1 ? "TEACHER_ABSENT" : "DONE") : undefined,
  });
  return {
    upcoming: next.map((d, i) => mk(d, i + 100, false)),
    past: past.reverse().map((d, i) => mk(d, i, true)),
    refundTk: Math.round(mySlot.monthlyPrice / 12),
  };
}

/** Chapters the student has started (demo progress). */
export const progress = [
  { subject: "Physics", chapter: "অধ্যায় ২: গতি", done: 0.6, sheet: "/content/sheets/c9-physics-ch2-motion.html" },
  { subject: "Chemistry", chapter: "অধ্যায় ৬: মোলের ধারণা", done: 0.3 },
  { subject: "Math", chapter: "অধ্যায় ৩: বীজগাণিতিক রাশি", done: 0.15 },
];

/** Lecture sheets. The first is live on the website; the rest are being written chapter by chapter. */
export const sheets = [
  { id: "p1", subject: "Physics", chapter: 1, title: "ভৌত রাশি ও পরিমাপ", href: undefined },
  { id: "p2", subject: "Physics", chapter: 2, title: "গতি", href: "/content/sheets/c9-physics-ch2-motion.html" },
  { id: "p3", subject: "Physics", chapter: 3, title: "বল", href: undefined },
  { id: "p4", subject: "Physics", chapter: 4, title: "কাজ, ক্ষমতা ও শক্তি", href: undefined },
  { id: "c4", subject: "Chemistry", chapter: 4, title: "পর্যায় সারণি", href: undefined },
  { id: "c6", subject: "Chemistry", chapter: 6, title: "মোলের ধারণা ও রাসায়নিক গণনা", href: undefined },
  { id: "m1", subject: "Math", chapter: 3, title: "বীজগাণিতিক রাশি", href: undefined },
] as const;

export const exams = [
  { id: "e1", subject: "Physics", title: "গতি: ঝটপট MCQ", qs: 15, min: 15, kind: "MCQ", by: "রাফিউল হাসান", due: "আজ রাত ১০টা পর্যন্ত" },
  { id: "e2", subject: "Physics", title: "গতি: সৃজনশীল (লিখে ছবি তুলে জমা)", qs: 2, min: 40, kind: "লিখিত", by: "রাফিউল হাসান", due: "শুক্রবার" },
  { id: "e3", subject: "Chemistry", title: "মোলের ধারণা: সাপ্তাহিক টেস্ট", qs: 20, min: 20, kind: "MCQ", by: "নুসরাত জাহান", due: "শনিবার" },
];

/* ---------- Teacher mode (demo: the tutor is Rafiul Hasan) ---------- */

export const me = rafi;

const STUDENT_NAMES = ["তাসনিম", "আরিয়ান", "নাফিসা", "সামিন", "রিদওয়ান", "ইশরাত", "মাহির", "তানহা"];

/** Each routine slot is a batch; students are demo names. */
export function myBatches() {
  return rafi.routine.map((slot: WeeklySlot, i) => ({
    id: `${slot.id}-${i}`,
    slot,
    students: STUDENT_NAMES.slice(i * 3, i * 3 + slot.seatsTaken),
    nextClasses: upcomingOccurrences(slot, new Date(), 6),
  }));
}

/** Teaching schedule across all batches, soonest first. */
export function teachingSchedule(now = new Date()) {
  return myBatches()
    .flatMap((b) => b.nextClasses.map((start) => ({ start, batch: b })))
    .filter((x) => x.start > new Date(now.getTime() - 60 * 60_000))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 8);
}

/** Earnings with the real commission ladder and refund rules, same as the website teacher dashboard. */
export function myEarnings(now = new Date()) {
  const paidClasses = 63;
  const rate = commissionRate(paidClasses);
  const rows = Array.from({ length: 10 }, (_, i) => {
    const s = rafi.routine[i % 2]!;
    const share = perClassShares(s.monthlyPrice, s.days.length * 4)[0]! * s.batchSize;
    const outcome: SessionOutcome = i === 4 ? "TEACHER_LATE_OR_SHORT" : i === 7 ? "STUDENT_NO_SHOW" : "COMPLETED";
    const st = settleClass({ classShare: share, outcome, commissionRate: rate });
    return { id: `r${i}`, date: new Date(now.getTime() - i * 1.3 * 86_400_000), subject: s.subjects[0]!, outcome, pending: i < 2, ...st };
  });
  const released = rows.filter((r) => !r.pending);
  const sum = (k: "teacherNet" | "refund", list = released) => list.reduce((a, r) => a + r[k], 0);
  const net = sum("teacherNet");
  const paidOut = Math.floor(net * 0.6);
  return { rate, paidClasses, net, pending: sum("teacherNet", rows.filter((r) => r.pending)), available: net - paidOut, paidOut, lost: sum("refund"), rows, nextTier: paidClasses < 50 ? 50 : paidClasses < 200 ? 200 : null };
}
