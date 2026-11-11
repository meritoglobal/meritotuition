import { copy } from "@/lib/copy";
import { AUTH_LIVE, DEMO_CODE, OTP_CHANNEL, safeNext } from "@/lib/auth/config";
import { getLang } from "@/lib/lang";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const lang = await getLang();
  const c = copy(lang).login;
  return (
    <section className="bg-board text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="text-[15px] font-semibold text-gold">{c.badge}</p>
          <h1 className="font-display mt-4 text-5xl leading-[1.05] sm:text-6xl">{c.h1}</h1>
          <p className="mt-5 max-w-lg text-lg text-white/80">{c.sub}</p>
          <ul className="mt-6 space-y-2.5 text-[15px] text-white/75">
            {c.perks.map((x) => (
              <li key={x} className="flex gap-3">
                <span className="mt-[0.75em] h-px w-4 shrink-0 bg-gold" />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-paper p-6 text-ink sm:p-8">
          <LoginForm channel={OTP_CHANNEL} next={safeNext(next)} demoNote={AUTH_LIVE ? undefined : c.demo(DEMO_CODE)} />
        </div>
      </div>
    </section>
  );
}
