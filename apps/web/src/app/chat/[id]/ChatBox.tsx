"use client";
import { useEffect, useRef, useState } from "react";
import { growthCopy } from "@/lib/copy-growth";
import { useLang } from "@/lib/lang-client";
import { L } from "@/lib/l10n";
import { maskContacts } from "@/lib/growth/mask";
import type { Message } from "@/lib/growth/chat";

/** Messages with a light poll (every 4 s while the tab is visible). */
export default function ChatBox({ threadId, initial }: { threadId: string; initial: Message[] }) {
  const lang = useLang();
  const c = growthCopy(lang).chat;
  const [list, setList] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const last = list.at(-1)?.id ?? 0;

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [list.length]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const r = await fetch(`/api/chat/${threadId}?after=${last}`, { cache: "no-store" }).catch(() => null);
      const j = (await r?.json().catch(() => null)) as { messages?: Message[] } | null;
      if (!stop && j?.messages?.length) setList((l) => [...l, ...j.messages!.filter((m) => !l.some((x) => x.id === m.id))]);
    };
    const t = setInterval(tick, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [threadId, last]);

  const preview = text ? maskContacts(text) : null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    const r = await fetch(`/api/chat/${threadId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { message?: Message } | null;
    if (j?.message) { setList((l) => [...l, j.message!]); setText(""); }
    setBusy(false);
  }

  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {list.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] ${m.mine ? "rounded-br-sm bg-board text-white" : "rounded-bl-sm bg-mist"}`}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`mt-0.5 text-[11px] ${m.mine ? "text-white/60" : "text-ink-3"}`}>{L.dateTime(new Date(m.at), lang)}{m.masked ? ` · ${c.masked}` : ""}</p>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <p className="pb-1 text-[11px] text-ink-3">{c.rule}</p>
      {preview?.masked && <p className="pb-1 text-xs text-redpen">{c.masked}: {preview.text}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-line pt-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) send(e); }}
          rows={1} maxLength={2000} placeholder={c.ph} className="min-h-11 flex-1 resize-none rounded-xl border border-line px-3 py-2.5 text-[15px] outline-none focus:border-ink" />
        <button disabled={busy || !text.trim()} className="btn-board px-4!">{c.send}</button>
      </form>
    </>
  );
}
