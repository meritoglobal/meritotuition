"use client";
import type { ReactNode } from "react";

/** A submit button that asks "are you sure?" first. Use inside a <form action={...}>. */
export function Confirm({ ask, className, children }: { ask: string; className?: string; children: ReactNode }) {
  return (
    <button className={className} onClick={(e) => { if (!window.confirm(ask)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
