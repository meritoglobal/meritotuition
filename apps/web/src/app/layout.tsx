import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { copy } from "@/lib/copy";
import { signOut } from "@/lib/auth/actions";
import { getUser } from "@/lib/auth/session";
import { getLang } from "@/lib/lang";
import { LangProvider, LangToggle } from "@/lib/lang-client";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const c = copy(lang);
  return {
    metadataBase: new URL("https://mastermoshai.net"),
    manifest: "/manifest.webmanifest",
    icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/brand/favicon-32.png", sizes: "32x32" }], apple: "/apple-icon.png" },
    openGraph: { siteName: lang === "bn" ? "মাস্টারমশাই" : "Mastermoshai", images: ["/brand/logo-horizontal@4x.png"] },
    title: c.meta.title,
    description: c.meta.description,
  };
}

function Logo({ bn }: { bn: boolean }) {
  return (
    <Link href="/" aria-label="Mastermoshai home" className="flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bn ? "/brand/logo-horizontal.svg" : "/brand/logo-horizontal-en-only.svg"} alt="মাস্টারমশাই · Mastermoshai" width={172} height={40} className="h-9 w-auto sm:h-10" />
    </Link>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, user] = await Promise.all([getLang(), getUser()]);
  const c = copy(lang);
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body className="min-h-screen">
        <LangProvider lang={lang}>
        {process.env.NEXT_PUBLIC_PREVIEW !== "off" && (
          <div className="bg-gold px-4 py-2 text-center text-[13px] font-medium text-ink">{c.preview}</div>
        )}
        <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:gap-8 sm:px-5">
            <Logo bn={lang === "bn"} />
            <div className="hidden gap-6 text-[15px] font-medium md:flex">
              <Link href="/teachers?mode=ONLINE" className="hover:underline underline-offset-4">{c.nav.online}</Link>
              <Link href="/teachers?mode=OFFLINE" className="hover:underline underline-offset-4">{c.nav.home}</Link>
              <Link href="/videos" className="hover:underline underline-offset-4">{c.nav.free}</Link>
              <Link href="/dashboard/teacher" className="hover:underline underline-offset-4">{c.nav.teach}</Link>
            </div>
            <div className="ml-auto flex items-center gap-3 whitespace-nowrap sm:gap-4">
              <LangToggle />
              {user ? (
                <>
                  <Link href="/dashboard/student" className="hidden text-[15px] font-semibold sm:block">{c.nav.mine}</Link>
                  <form action={signOut} className="hidden sm:block">
                    <button className="text-[15px] font-medium text-ink-2 hover:text-ink" title={user.email ?? user.phone}>{c.nav.logout}</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="text-[15px] font-semibold">{c.nav.login}</Link>
              )}
              <Link href="/teachers" className="btn-board hidden px-4! py-2! sm:inline-flex">{c.nav.find}</Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="mt-24 bg-board text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:grid-cols-4">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-horizontal-on-dark.svg" alt="Mastermoshai · মাস্টারমশাই" width={240} height={56} className="h-14 w-auto" />
              <p className="mt-3 text-lg font-semibold text-gold">{c.footer.tagline}</p>
              <p className="mt-2 text-sm text-white/60">{c.footer.line}</p>
            </div>
            {c.footer.cols.map(([h, items]) => (
              <div key={h}>
                <div className="text-sm font-semibold">{h}</div>
                <ul className="mt-3 space-y-2 text-sm text-white/60">
                  {items.map((i) => <li key={i}>{i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </footer>
        </LangProvider>
      </body>
    </html>
  );
}
