"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Room } from "livekit-client";
import { toolsCopy } from "@/lib/copy-tools";
import { L } from "@/lib/l10n";
import { useLang } from "@/lib/lang-client";
import { CloudUpload } from "@/lib/class/cloud-upload";
import { LocalRecorder, pickMime, isIOS, listRecordings, recordingSupported, removeRecording, saveRecording, type RecMeta } from "@/lib/class/local-recorder";

const KEY = "mm_rec_consent";
const getConsent = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const setConsent = (v: "yes" | "no") => { try { localStorage.setItem(KEY, v); } catch {} };

/**
 * Student side: records the class on the device while they are in it.
 * Asks once ("yes, always" is remembered), then starts by itself every class.
 * When the class ends the file is saved automatically (download / iPhone share sheet).
 */
export function useDeviceRecording(room: Room, classId: string, title: string, on: boolean) {
  const [consent, setC] = useState<string | null>("pending");
  const [recording, setRecording] = useState(false);
  const rec = useRef<LocalRecorder | null>(null);

  useEffect(() => { setC(recordingSupported() ? getConsent() : "no"); }, []);

  const begin = useCallback(async () => {
    if (rec.current) return;
    const r = new LocalRecorder(room, classId, title);
    rec.current = r;
    try { await r.start(); setRecording(true); } catch { rec.current = null; }
  }, [room, classId, title]);

  useEffect(() => { if (on && consent === "yes") void begin(); }, [on, consent, begin]);

  // Class over (left, or tutor ended it): finish the file and put it on the device.
  useEffect(() => () => {
    const r = rec.current;
    rec.current = null;
    if (!r) return;
    void r.stop().then((m) => { if (m && !isIOS()) void saveRecording(m).catch(() => {}); });
  }, []);

  return {
    recording,
    ask: on && consent === null,
    answer: (yes: boolean) => {
      setConsent(yes ? "yes" : "no");
      setC(yes ? "yes" : "no");
    },
  };
}

/**
 * Tutor side: the tutor's device records the class and uploads it to R2 as it
 * goes; every student of the batch can watch or download it for 72 hours.
 * If cloud storage isn't set up, the file is kept on the tutor's device instead.
 */
export function useCloudRecording(room: Room, classId: string, title: string, on: boolean) {
  const [recording, setRecording] = useState(false);
  const live = useRef<{ rec: LocalRecorder; up: CloudUpload | null } | null>(null);

  useEffect(() => {
    if (!on || live.current || !recordingSupported()) return;
    let cancelled = false;
    void (async () => {
      const up = await CloudUpload.start(classId, pickMime());
      if (cancelled) return;
      const rec = new LocalRecorder(room, classId, title, { persist: !up, onData: (b) => up?.push(b) });
      live.current = { rec, up };
      try { await rec.start(); setRecording(true); } catch { live.current = null; }
    })();
    return () => { cancelled = true; };
  }, [on, room, classId, title]);

  useEffect(() => {
    const bye = () => live.current?.up?.beacon();
    window.addEventListener("pagehide", bye);
    return () => {
      window.removeEventListener("pagehide", bye);
      const l = live.current;
      live.current = null;
      if (!l) return;
      void l.rec.stop().then(async (m) => {
        if (l.up) await l.up.finish();
        else if (m && !isIOS()) await saveRecording(m).catch(() => {});
      });
    };
  }, []);

  return { recording };
}

export function RecordConsent({ onAnswer }: { onAnswer: (yes: boolean) => void }) {
  const t = toolsCopy(useLang()).rec;
  return (
    <div className="absolute inset-x-2 top-2 z-20 mx-auto max-w-md rounded-xl bg-chalk p-4 text-ink shadow-xl">
      <h3 className="font-semibold">{t.askH}</h3>
      <p className="mt-1 text-sm text-ink-2">{t.askBody}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={() => onAnswer(false)} className="btn-ghost text-sm">{t.askNo}</button>
        <button onClick={() => onAnswer(true)} className="btn-board text-sm">{t.askYes}</button>
      </div>
    </div>
  );
}

/** Recordings kept on this device: save again, or delete. Shows nothing if there are none. */
export function DeviceRecordings({ classId, className = "" }: { classId?: string; className?: string }) {
  const lang = useLang();
  const t = toolsCopy(lang).rec;
  const [list, setList] = useState<RecMeta[] | null>(null);
  const load = useCallback(() => { void listRecordings().then((l) => setList(classId ? l.filter((m) => m.classId === classId) : l)).catch(() => setList([])); }, [classId]);
  useEffect(load, [load]);
  if (!list?.length) return null;
  const ios = isIOS();
  const mb = (b: number) => L.num(`${Math.max(1, Math.round(b / 1048576))} MB`, lang);
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold">{t.mineH}</h3>
      <p className="text-xs text-ink-3">{t.mineNote}</p>
      <ul className="mt-2 divide-y divide-line">
        {list.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{m.title}</span>
              <span className="text-xs text-ink-3">{L.dateTime(new Date(m.startedAt), lang)} · {mb(m.size)}{m.saved ? ` · ${t.savedTag}` : ""}</span>
            </span>
            <span className="flex shrink-0 gap-2">
              <button onClick={async () => { await saveRecording(m, ios); load(); }} className="btn-board px-3! py-1! text-sm">{ios ? t.saveShare : t.save}</button>
              <button onClick={async () => { await removeRecording(m.id); load(); }} className="px-2 text-sm text-redpen">{t.del}</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
