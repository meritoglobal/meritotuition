/** A hand-drawn underline (chalk on the board, red pen on paper). Use on one or two words only. */
export function Scribble({ children, color = "var(--color-gold)" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="scribble">
      {children}
      <svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
        <path d="M3 8.5c28-4.2 61-6.1 98-5.2 33 .8 63 2.6 96 1.3" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M18 10.6c40-2.4 92-3 160-1.4" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
      </svg>
    </span>
  );
}
