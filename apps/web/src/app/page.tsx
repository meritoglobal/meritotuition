import Link from "next/link";
import { CLASS_LEVELS, CLASS_LEVEL_LABEL, DEMO_TEACHERS, DEMO_VIDEOS, DHAKA_AREAS, SUBJECTS, rankScore } from "@mastermoshai/core";
import { TeacherCard } from "@/components/TeacherCard";
import { VideoCard } from "@/components/VideoCard";

const FAQ = [
  ["How does the free trial work?", "Pick a batch with a trial seat and join one real class for free. Enroll only if you like the tutor."],
  ["What if the tutor misses a class?", "Our classroom records who joined and when. If the tutor does not show up within 15 minutes, that class is refunded to you automatically."],
  ["Can I stop in the middle of a month?", "Yes. Every class not yet taught goes back to you. You only pay for classes that happened."],
  ["Online or at home: which is better?", "Online batches are cheaper and need no travel. Home tutors come to you within their area. Both use the same payment protection."],
  ["Who are the tutors?", "Students and graduates of BUET, DU, NSU, JU and other top universities. We check student ID and NID before the Verified badge."],
];

export default function Home() {
  const top = [...DEMO_TEACHERS].sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 3);
  return (
    <>
      {/* HERO: full-bleed flat colour block */}
      <section className="border-b-2 border-ink bg-sun">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-14 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <span className="inline-block -rotate-2 rounded-lg border-2 border-ink bg-paper px-3 py-1 text-sm font-bold">Pay per class. Not per promise.</span>
            <h1 className="font-display mt-5 text-5xl font-extrabold leading-[0.95] sm:text-7xl">
              A tutor who actually shows up.
            </h1>
            <ul className="mt-6 space-y-2 text-lg font-medium">
              {["1:1 or small batches of up to 5", "Online from home, or a tutor near you in Dhaka", "First class free · missed classes refunded"].map((x) => (
                <li key={x} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-ink text-xs text-sun">✓</span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <LiveClassMock />
        </div>
        {/* search bar (Preply-style labelled fields) */}
        <div className="mx-auto max-w-7xl px-5 pb-12">
          <form action="/teachers" className="grid gap-2 rounded-xl border-2 border-ink bg-paper p-2 shadow-[6px_6px_0_0_#121117] md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <label className="field border-0!">
              <span>I want to learn</span>
              <select name="subjects" defaultValue="">
                <option value="">Any subject</option>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="field border-0!">
              <span>Class</span>
              <select name="level" defaultValue="">
                <option value="">Any class</option>
                {CLASS_LEVELS.map((l) => <option key={l} value={l}>{CLASS_LEVEL_LABEL[l]}</option>)}
              </select>
            </label>
            <label className="field border-0!">
              <span>How</span>
              <select name="mode" defaultValue="">
                <option value="">Online or at home</option>
                <option value="ONLINE">Online live class</option>
                <option value="OFFLINE">Home tutor near me</option>
              </select>
            </label>
            <label className="field border-0!">
              <span>I live in</span>
              <select name="area" defaultValue="Farmgate">
                {Object.keys(DHAKA_AREAS).map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
            <button className="btn-ink text-base">Find tutors →</button>
          </form>
        </div>
      </section>

      {/* TRUST STATS (GoStudent-style row) */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x-2 divide-ink md:grid-cols-4">
          {[
            ["4.8 ★", "average class rating"],
            ["৳0", "for your first class"],
            ["15 min", "no-show = auto refund"],
            ["BUET · DU · NSU", "verified tutors"],
          ].map(([k, v]) => (
            <div key={k} className="px-5 py-6">
              <div className="font-display text-3xl font-extrabold">{k}</div>
              <div className="text-sm text-ink-2">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TWO WAYS TO LEARN */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <h2 className="font-display max-w-3xl text-4xl font-extrabold leading-none sm:text-6xl">Two ways to learn. One safe wallet.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Link href="/teachers?mode=ONLINE" className="group rounded-xl border-2 border-ink bg-lilac p-8 transition hover:-translate-y-1">
            <div className="text-sm font-bold uppercase tracking-wide">Online</div>
            <div className="font-display mt-2 text-4xl font-extrabold">Live class in the app</div>
            <p className="mt-3 max-w-md text-lg">No Zoom links. Your tutor taps Start, you get a notification, you tap Join. Batches from 1:1 to 1:5.</p>
            <div className="mt-6 font-semibold group-hover:underline">Browse online tutors →</div>
          </Link>
          <Link href="/teachers?mode=OFFLINE" className="group rounded-xl border-2 border-ink bg-mint p-8 transition hover:-translate-y-1">
            <div className="text-sm font-bold uppercase tracking-wide">At home</div>
            <div className="font-display mt-2 text-4xl font-extrabold">A tutor near you</div>
            <p className="mt-3 max-w-md text-lg">See tutors on the map around Farmgate, Dhanmondi, Mirpur and more. Filter by BUET, DU and other universities.</p>
            <div className="mt-6 font-semibold group-hover:underline">Find home tutors →</div>
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-ink py-20 text-white">
        <div className="mx-auto max-w-7xl px-5">
          <h2 className="font-display text-4xl font-extrabold sm:text-6xl">How it works</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              ["Find", "Search by subject, class, area and university. Watch the tutor's free classes first."],
              ["Try free", "Join one real class in an open seat. No payment, no commitment."],
              ["Learn, protected", "Pay the month in advance. The tutor is paid class by class, only after each class happens."],
            ].map(([h, p], i) => (
              <div key={h}>
                <div className="font-display text-7xl font-extrabold text-sun">0{i + 1}</div>
                <div className="font-display mt-3 text-2xl font-extrabold">{h}</div>
                <p className="mt-2 text-white/70">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FREE CLASSES */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl font-extrabold sm:text-5xl">Free classes. Try the teaching first.</h2>
          <Link href="/videos" className="hidden font-semibold underline underline-offset-4 sm:block">All free classes</Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_VIDEOS.slice(0, 4).map((v, i) => <VideoCard key={v.id} v={v} i={i} />)}
        </div>
      </section>

      {/* TOP TUTORS */}
      <section className="mx-auto max-w-7xl px-5">
        <h2 className="font-display text-4xl font-extrabold sm:text-5xl">Tutors students book most</h2>
        <div className="mt-8 space-y-4">
          {top.map((t, i) => <TeacherCard key={t.id} t={t} highlight={i === 0} />)}
        </div>
      </section>

      {/* GUARANTEE */}
      <section className="mx-auto mt-20 max-w-7xl px-5">
        <div className="grid gap-8 rounded-xl border-2 border-ink bg-coral p-10 md:grid-cols-[1.4fr_1fr] md:items-center">
          <h2 className="font-display text-4xl font-extrabold leading-none text-ink sm:text-6xl">Missed class? It comes back to you.</h2>
          <ul className="space-y-3 text-lg font-medium">
            <li>Tutor absent 15 min → 100% back</li>
            <li>Late or cut short → 50% back</li>
            <li>Not happy → flag within 48 h, we review</li>
            <li>Stop any time → untaught classes back</li>
          </ul>
        </div>
      </section>

      {/* TEACH */}
      <section className="mx-auto mt-20 grid max-w-7xl gap-8 px-5 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="font-display text-4xl font-extrabold leading-none sm:text-6xl">Teach on Mastermoshai.</h2>
          <p className="mt-4 text-lg text-ink-2">Set your weekly routine, choose online or home tuition, post free classes to get students, and withdraw to bKash every week.</p>
          <Link href="/dashboard/teacher" className="btn-ink mt-6">Become a tutor</Link>
        </div>
        <div className="card grid grid-cols-2 gap-px overflow-hidden bg-line p-0">
          {[["Your price", "you set it"], ["Commission", "25% → 15% as you grow"], ["Payout", "weekly to bKash"], ["Students", "online + your area"]].map(([k, v]) => (
            <div key={k} className="bg-paper p-6">
              <div className="text-sm text-ink-2">{k}</div>
              <div className="mt-1 text-lg font-bold">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-20 max-w-3xl px-5">
        <h2 className="font-display text-4xl font-extrabold">Questions</h2>
        <div className="mt-6 divide-y-2 divide-line border-y-2 border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-semibold">
                {q}
                <span className="text-2xl transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

/** A real-looking class card instead of stock photos. */
function LiveClassMock() {
  return (
    <div className="relative">
      <div className="rotate-2 rounded-xl border-2 border-ink bg-paper p-4 shadow-[8px_8px_0_0_#121117]">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold">Physics · Class 9-10 · 1:3</span>
          <span className="tag bg-coral text-ink">● LIVE</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="col-span-2 row-span-2 grid aspect-video place-items-center rounded-lg bg-ink font-display text-lg text-white">F = m × a</div>
          <div className="grid place-items-center rounded-lg bg-lilac text-xs font-bold">Ayan</div>
          <div className="grid place-items-center rounded-lg bg-mint text-xs font-bold">Rafi (tutor)</div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-ink-2">Joined 4:58 PM · on time</span>
          <span className="font-semibold">42:10</span>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-4 -rotate-3 rounded-lg border-2 border-ink bg-paper px-4 py-3 text-sm shadow-[4px_4px_0_0_#121117]">
        <div className="font-bold">৳250 released to tutor</div>
        <div className="text-ink-2">after class ended · 48 h window</div>
      </div>
    </div>
  );
}
