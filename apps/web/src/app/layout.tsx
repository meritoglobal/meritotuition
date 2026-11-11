import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Porao — find your tutor, online or near home",
  description: "1:1 and small-batch tutoring in Bangladesh with verified university tutors, free trial classes and money-back protection.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-xl font-bold text-brand-700">
              Porao <span className="font-normal text-slate-400">পড়াও</span>
            </Link>
            <div className="hidden gap-5 text-sm text-slate-600 sm:flex">
              <Link href="/teachers" className="hover:text-brand-700">Find a tutor</Link>
              <Link href="/videos" className="hover:text-brand-700">Free classes</Link>
              <Link href="/dashboard/student" className="hover:text-brand-700">My classes</Link>
              <Link href="/dashboard/teacher" className="hover:text-brand-700">For teachers</Link>
            </div>
            <Link href="/teachers" className="ml-auto rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Book a free trial
            </Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="mt-16 border-t border-slate-200 py-8 text-center text-sm text-slate-500">
          Money-back protection on every class · Verified university tutors · bKash, Nagad, cards
        </footer>
      </body>
    </html>
  );
}
