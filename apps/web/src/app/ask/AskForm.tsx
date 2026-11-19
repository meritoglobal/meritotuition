"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CLASS_LEVELS, SUBJECTS, type ClassLevel } from "@mastermoshai/core";
import { growthCopy } from "@/lib/copy-growth";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";

/** Shrink phone photos before upload (saves mobile data): longest side 1600 px, JPEG. */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((ok) => canvas.toBlob((b) => ok(b ?? file), "image/jpeg", 0.85));
}

export default function AskForm() {
  const lang = useLang();
  const g = growthCopy(lang);
  const c = g.ask;
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(f?: File) {
    if (!f) return;
    const blob = await shrink(f);
    if (blob.size > 5 * 1024 * 1024) { setErr(c.big); return; }
    setErr("");
    setImg({ blob, url: URL.createObjectURL(blob) });
  }

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!img && !String(fd.get("text") ?? "").trim()) { setErr(c.need); return; }
    if (img) fd.set("image", img.blob, "question.jpg");
    setBusy(true);
    setErr("");
    const r = await fetch("/api/ask", { method: "POST", body: fd }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { id?: string; error?: string } | null;
    if (j?.id) router.push(`/ask/${j.id}`);
    else { setErr(g.error); setBusy(false); }
  }

  return (
    <form onSubmit={send} className="card space-y-3 p-5">
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {img ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt={c.photo} className="max-h-72 w-full rounded-lg object-contain bg-mist" />
          <button type="button" onClick={() => input.current?.click()} className="btn-ghost absolute right-2 top-2 px-3! py-1.5! text-sm">{c.change}</button>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line text-ink-2 hover:border-ink-3">
          <span className="text-4xl">📷</span><span className="font-semibold">{c.pick}</span>
        </button>
      )}
      <textarea name="text" rows={3} maxLength={2000} placeholder={c.text} className="w-full rounded-lg border border-line p-3 text-[15px]" />
      <div className="grid grid-cols-2 gap-2">
        <label className="field"><span>{c.subject}</span><select name="subject" defaultValue="Physics">{SUBJECTS.map((s) => <option key={s} value={s}>{L.subject(s, lang)}</option>)}</select></label>
        <label className="field"><span>{c.level}</span><select name="level" defaultValue="CLASS_9_10">{CLASS_LEVELS.map((l) => <option key={l} value={l}>{L.level(l as ClassLevel, lang)}</option>)}</select></label>
      </div>
      {err && <p role="alert" className="text-sm text-redpen">{err}</p>}
      <button disabled={busy} className="btn-gold w-full">{busy ? c.sending : c.send}</button>
    </form>
  );
}
