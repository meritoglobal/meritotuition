import Link from "next/link";
import { CLASS_LEVELS, CLASS_LEVEL_LABEL, DEMO_TEACHERS, DEMO_VIDEOS, DHAKA_AREAS, SUBJECTS, rankScore } from "@merito/core";
import { TeacherCard } from "@/components/TeacherCard";
import { VideoCard } from "@/components/VideoCard";

export default function Home() {
  const top = [...DEMO_TEACHERS].sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 4);
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-14">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            The right tutor, <span className="text-brand-700">online or near your home.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            Learn 1:1 or in small batches of up to 5 with verified tutors from BUET, DU and top universities. Try a class free. Pay only for classes that really happen.
          </p>
          <form action="/teachers" className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-5">
            <select name="subjects" className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" defaultValue="">
              <option value="">Any subject</option>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select name="level" className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" defaultValue="">
              <option value="">Any class</option>
              {CLASS_LEVELS.map((l) => <option key={l} value={l}>{CLASS_LEVEL_LABEL[l]}</option>)}
            </select>
            <select name="mode" className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" defaultValue="">
              <option value="">Online or home</option>
              <option value="ONLINE">Online live class</option>
              <option value="OFFLINE">Home tutor near me</option>
            </select>
            <select name="area" className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" defaultValue="Farmgate">
              {Object.keys(DHAKA_AREAS).map((a) => <option key={a}>{a}</option>)}
            </select>
            <button className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Search tutors</button>
          </form>
          <div className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
            {[
              ["Free trial class", "Meet the tutor and try a real class before you pay."],
              ["Money-back protection", "Your payment is held safely. Missed or bad classes are refunded."],
              ["One-tap live class", "No Zoom or Meet links. Join from the app when the tutor starts."],
            ].map(([h, p]) => (
              <div key={h} className="rounded-xl bg-white/70 p-4">
                <div className="font-semibold text-brand-900">{h}</div>
                <div className="text-slate-600">{p}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Free classes from our tutors</h2>
          <Link href="/videos" className="text-sm font-medium text-brand-700 hover:underline">See all →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_VIDEOS.slice(0, 4).map((v) => <VideoCard key={v.id} v={v} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <h2 className="mb-4 text-2xl font-bold">Top tutors this week</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {top.map((t) => <TeacherCard key={t.id} t={t} />)}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4">
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-brand-900 p-8 text-white sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Are you a university student who can teach?</h2>
            <p className="mt-1 text-brand-100">Set your weekly routine, teach online or near your campus, and get paid every week to bKash.</p>
          </div>
          <Link href="/dashboard/teacher" className="rounded-full bg-white px-5 py-2.5 font-semibold text-brand-900">Start teaching</Link>
        </div>
      </section>
    </>
  );
}
