import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mastermoshai — the right tutor, online or near home",
  description: "1:1 and small-batch tutoring in Dhaka with verified university tutors, free trial classes and pay-per-class protection.",
};

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink font-display text-lg font-extrabold text-sun">m</span>
      <span className="font-display text-xl font-extrabold">
        master<span className="text-ink-3">moshai</span>
      </span>
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-line bg-paper">
          <nav className="mx-auto flex max-w-7xl items-center gap-8 px-5 py-3">
            <Logo />
            <div className="hidden gap-6 text-[15px] font-medium md:flex">
              <Link href="/teachers?mode=ONLINE" className="hover:underline underline-offset-4">Online tutors</Link>
              <Link href="/teachers?mode=OFFLINE" className="hover:underline underline-offset-4">Home tutors</Link>
              <Link href="/videos" className="hover:underline underline-offset-4">Free classes</Link>
              <Link href="/dashboard/teacher" className="hover:underline underline-offset-4">Teach on Mastermoshai</Link>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="hidden rounded-lg border-2 border-line p-0.5 text-xs font-semibold sm:flex">
                <span className="rounded-md bg-ink px-2 py-1 text-white">EN</span>
                <span className="px-2 py-1 text-ink-2">বাং</span>
              </div>
              <Link href="/dashboard/student" className="hidden text-[15px] font-semibold sm:block">My classes</Link>
              <Link href="/teachers" className="btn-ink px-4! py-2!">Find a tutor</Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="mt-24 bg-ink text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:grid-cols-4">
            <div>
              <div className="font-display text-2xl font-extrabold">master<span className="text-sun">moshai</span></div>
              <p className="mt-2 text-sm text-white/60">mastermoshai.net · Dhaka · bKash · Nagad · Cards</p>
            </div>
            {[
              ["Students", ["Online tutors", "Home tutors", "Free classes", "How refunds work"]],
              ["Teachers", ["Become a tutor", "Set your routine", "Earnings & payouts"]],
              ["Company", ["About Mastermoshai", "Safety", "Contact"]],
            ].map(([h, items]) => (
              <div key={h as string}>
                <div className="text-sm font-semibold">{h as string}</div>
                <ul className="mt-3 space-y-2 text-sm text-white/60">
                  {(items as string[]).map((i) => <li key={i}>{i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </footer>
      </body>
    </html>
  );
}
