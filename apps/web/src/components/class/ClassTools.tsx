"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toolsCopy } from "@/lib/copy-tools";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";

type Role = "teacher" | "student";
type Tab = "files" | "recordings" | "exams";

interface Material { id: string; title: string; size: number | null; mime: string | null; at: string; url: string | null }
interface Recording { name: string; at: string; size: number | null; url: string | null }
export interface ExamSummary {
  id: string; title: string; durationMin: number | null; maxMarks: number; published: boolean; at: string; count: number; kinds: string[];
  submitted?: number; toCheck?: number; mine?: { checked: boolean; total: number } | null;
}

export const asQ = (role: Role) => (role === "teacher" ? "?as=teacher" : "");
const ACCEPT = ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.zip";

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "off" | "error">("loading");
  const load = useCallback(async () => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.status === 503) return setState("off");
      if (!r.ok) return setState("error");
      setData(await r.json());
      setState("ok");
    } catch {
      setState("error");
    }
  }, [url]);
  useEffect(() => { void load(); }, [load]);
  return { data, state, reload: load };
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-mist px-4 py-6 text-center text-sm text-ink-2">{children}</p>;
}

const fmtSize = (b: number | null, lang: "bn" | "en") => (b ? L.num(b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`, lang) : "");

/** Files, recordings and exams for one class. Sits under the classroom. */
export default function ClassTools({ classId, role, initial = "files" }: { classId: string; role: Role; initial?: Tab }) {
  const lang = useLang();
  const t = toolsCopy(lang);
  const [tab, setTab] = useState<Tab>(initial);
  return (
    <section className="card mt-6 p-4 sm:p-6">
      <div className="flex gap-1 border-b border-line">
        {(["files", "recordings", "exams"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${tab === k ? "border-board text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>
            {t.tabs[k]}
          </button>
        ))}
      </div>
      <div className="pt-4">
        {tab === "files" && <Files classId={classId} role={role} />}
        {tab === "recordings" && <Recordings classId={classId} role={role} />}
        {tab === "exams" && <Exams classId={classId} role={role} />}
      </div>
    </section>
  );
}

function Files({ classId, role }: { classId: string; role: Role }) {
  const lang = useLang();
  const t = toolsCopy(lang);
  const base = `/api/class/${encodeURIComponent(classId)}/files`;
  const { data, state, reload } = useApi<{ materials: Material[] }>(`${base}${asQ(role)}`);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function upload(f: File) {
    setErr("");
    const r = await fetch(`${base}/upload-url${asQ(role)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: f.name, size: f.size }) });
    if (!r.ok) { setErr(r.status === 400 ? t.files.bad : t.error); return; }
    const { path, signedUrl } = (await r.json()) as { path: string; signedUrl: string };
    // XHR so we can show progress on slow connections.
    const ok = await new Promise<boolean>((res) => {
      const x = new XMLHttpRequest();
      x.open("PUT", signedUrl);
      x.setRequestHeader("content-type", f.type || "application/octet-stream");
      x.setRequestHeader("x-upsert", "false");
      x.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((100 * e.loaded) / e.total));
      x.onload = () => res(x.status >= 200 && x.status < 300);
      x.onerror = () => res(false);
      setProgress(0);
      x.send(f);
    });
    if (ok) await fetch(`${base}${asQ(role)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path, title: f.name, size: f.size, mime: f.type }) });
    else setErr(t.error);
  }

  if (state === "off") return <Note>{t.off}</Note>;
  if (state === "error") return <Note>{t.error}</Note>;
  return (
    <div>
      {role === "teacher" && (
        <div className="mb-4">
          <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={async (e) => {
            const fs = [...(e.target.files ?? [])];
            e.target.value = "";
            for (const f of fs) await upload(f);
            setProgress(null);
            void reload();
          }} />
          <button disabled={progress !== null} onClick={() => input.current?.click()} className="btn-board text-sm">
            {progress !== null ? t.files.uploading(progress) : t.files.upload}
          </button>
          {err && <p role="alert" className="mt-2 text-sm text-redpen">{err}</p>}
        </div>
      )}
      {state === "loading" ? <Note>{t.loading}</Note> : data?.materials.length ? (
        <ul className="divide-y divide-line">
          {data.materials.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0 truncate">📄 {m.title} <span className="text-ink-3">{fmtSize(m.size, lang)}</span></span>
              <span className="flex shrink-0 gap-2">
                {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="btn-ghost px-3! py-1! text-sm">{t.files.open}</a>}
                {role === "teacher" && (
                  <button onClick={async () => { await fetch(`${base}${asQ(role)}${asQ(role) ? "&" : "?"}mid=${m.id}`, { method: "DELETE" }); void reload(); }} className="px-2 text-sm text-redpen">{t.files.remove}</button>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : <Note>{role === "teacher" ? t.files.emptyTeacher : t.files.empty}</Note>}
    </div>
  );
}

function Recordings({ classId, role }: { classId: string; role: Role }) {
  const lang = useLang();
  const t = toolsCopy(lang);
  const { data, state } = useApi<{ recordings: Recording[] }>(`/api/class/${encodeURIComponent(classId)}/files${asQ(role)}`);
  if (state === "off") return <Note>{t.off}</Note>;
  if (state === "error") return <Note>{t.error}</Note>;
  if (state === "loading") return <Note>{t.loading}</Note>;
  if (!data?.recordings.length) return <Note>{t.rec.empty}</Note>;
  return (
    <div className="space-y-4">
      {role === "student" && <p className="text-sm text-ink-2">{t.rec.note}</p>}
      {data.recordings.map((r) => (
        <figure key={r.name}>
          {r.url && <video src={r.url} controls preload="metadata" className="aspect-video w-full rounded-lg bg-black" />}
          <figcaption className="mt-1 text-xs text-ink-3">{L.dateTime(new Date(r.at), lang)} · {fmtSize(r.size, lang)}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function Exams({ classId, role }: { classId: string; role: Role }) {
  const lang = useLang();
  const t = toolsCopy(lang);
  const { data, state, reload } = useApi<{ exams: ExamSummary[] }>(`/api/class/${encodeURIComponent(classId)}/exams${asQ(role)}`);
  if (state === "off") return <Note>{t.off}</Note>;
  if (state === "error") return <Note>{t.error}</Note>;
  return (
    <div>
      {role === "teacher" && <Link href={`/class/${encodeURIComponent(classId)}/exams/new?as=teacher`} className="btn-board mb-4 inline-block text-sm">{t.exams.create}</Link>}
      {state === "loading" ? <Note>{t.loading}</Note> : data?.exams.length ? (
        <ul className="divide-y divide-line">
          {data.exams.map((e) => <ExamRow key={e.id} e={e} role={role} onChange={reload} />)}
        </ul>
      ) : <Note>{role === "teacher" ? t.exams.emptyTeacher : t.exams.empty}</Note>}
    </div>
  );
}

export function ExamRow({ e, role, onChange }: { e: ExamSummary; role: Role; onChange?: () => void }) {
  const lang = useLang();
  const t = toolsCopy(lang);
  const href = `/exams/${e.id}${asQ(role)}`;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="font-medium">{e.title}</div>
        <div className="text-xs text-ink-3">
          {e.kinds.map((k) => t.exams.kinds[k]).join(" + ")} · {t.exams.meta(e.count, e.maxMarks, e.durationMin)}
          {role === "teacher" && <> · <span className={e.published ? "text-leaf" : ""}>{e.published ? t.exams.published : t.exams.draft}</span></>}
        </div>
        {role === "teacher" && e.submitted !== undefined && <div className="text-xs text-ink-2">{t.exams.submitted(e.submitted, e.toCheck ?? 0)}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {role === "teacher" ? (
          <>
            <button onClick={async () => { await fetch(`/api/exams/${e.id}?as=teacher`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ published: !e.published }) }); onChange?.(); }} className="btn-ghost px-3! py-1! text-sm">
              {e.published ? t.exams.unpublish : t.exams.publish}
            </button>
            <Link href={href} className="btn-board px-3! py-1! text-sm">{t.exams.check}</Link>
          </>
        ) : e.mine ? (
          <Link href={href} className="text-sm font-semibold text-leaf">{e.mine.checked ? t.exams.result(e.mine.total, e.maxMarks) : t.exams.pending}</Link>
        ) : (
          <Link href={href} className="btn-gold px-3! py-1! text-sm">{t.exams.take}</Link>
        )}
      </div>
    </li>
  );
}
