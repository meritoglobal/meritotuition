export function Off({ text }: { text: string }) {
  return <p className="mt-6 rounded-lg bg-mist p-6 text-center text-sm text-ink-2">{text}</p>;
}

export function Flash({ tone, text }: { tone: "ok" | "bad"; text: string }) {
  return <p role="status" className={`mt-4 rounded-lg p-3 text-sm font-medium ${tone === "ok" ? "bg-home text-home-ink" : "bg-redpen-tint text-redpen"}`}>{text}</p>;
}

/** Answers from the AI or a tutor: keeps line breaks, turns **bold** and # headings into real ones. */
export function Answer({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-[15px] leading-relaxed">
      {text.split(/\n{2,}/).map((para, i) => {
        const h = /^#{1,4}\s+(.*)$/.exec(para.trim());
        if (h) return <h3 key={i} className="pt-1 font-semibold">{bold(h[1]!)}</h3>;
        return <p key={i} className="whitespace-pre-wrap">{bold(para.replace(/^#{1,4}\s+/gm, ""))}</p>;
      })}
    </div>
  );
}

function bold(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part));
}
