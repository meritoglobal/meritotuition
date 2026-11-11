import { copy } from "@/lib/copy";
import { AUTH_LIVE, DEMO_CODE, OTP_CHANNEL, safeNext } from "@/lib/auth/config";
import { getLang } from "@/lib/lang";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const lang = await getLang();
  const c = copy(lang).login;
  return (
    <section className="border-b-2 border-ink bg-sun">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <span className="inline-block -rotate-2 rounded-lg border-2 border-ink bg-paper px-3 py-1 text-sm font-bold">{c.badge}</span>
          <h1 className="font-display mt-5 text-5xl font-extrabold leading-[0.95] sm:text-7xl">{c.h1}</h1>
          <p className="mt-5 max-w-lg text-lg font-medium">{c.sub}</p>
          <ul className="mt-6 space-y-2 text-[15px] font-medium">
            {c.perks.map((x) => (
              <li key={x} className="flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink text-xs text-sun">✓</span>
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border-2 border-ink bg-paper p-6 shadow-[8px_8px_0_0_#121117] sm:p-8">
          <LoginForm channel={OTP_CHANNEL} next={safeNext(next)} demoNote={AUTH_LIVE ? undefined : c.demo(DEMO_CODE)} />
        </div>
      </div>
    </section>
  );
}
