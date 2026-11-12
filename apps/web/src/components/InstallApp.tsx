"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang-client";

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const T = {
  bn: { title: "মাস্টারমশাই অ্যাপ", sub: "হোম স্ক্রিনে বসিয়ে নাও, এক চাপে ক্লাসে।", install: "ইনস্টল করি", ios: "Safari-তে নিচের শেয়ার বোতাম (□↑) চাপো, তারপর \"Add to Home Screen\"।", close: "পরে" },
  en: { title: "Mastermoshai app", sub: "Put it on your home screen, one tap to class.", install: "Install", ios: "In Safari, tap Share (□↑) at the bottom, then \"Add to Home Screen\".", close: "Later" },
};
const KEY = "mm_install_dismissed";

/** Registers the service worker and offers "install the app" on phones. */
export default function InstallApp() {
  const lang = useLang();
  const t = T[lang === "en" ? "en" : "bn"];
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    let dismissed = false;
    try { dismissed = Number(localStorage.getItem(KEY) ?? 0) > Date.now(); } catch { /* private mode */ }
    if (standalone || dismissed) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); setShow(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)) { setIos(true); setShow(true); }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(KEY, String(Date.now() + 14 * 864e5)); } catch { /* ignore */ }
  };

  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-board p-3 text-white shadow-xl md:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/app-icon-192.png" alt="" width={44} height={44} className="h-11 w-11 rounded-lg" />
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-semibold">{t.title}</div>
        <div className="text-white/75">{ios ? t.ios : t.sub}</div>
      </div>
      {evt && (
        <button onClick={async () => { await evt.prompt(); await evt.userChoice; setShow(false); }} className="shrink-0 rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-board">{t.install}</button>
      )}
      <button onClick={dismiss} aria-label={t.close} className="shrink-0 px-1 text-white/70">✕</button>
    </div>
  );
}
