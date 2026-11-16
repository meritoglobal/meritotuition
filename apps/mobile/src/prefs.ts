/** Tiny in-memory store for the student's chosen class level (saved on the server once login is wired in). */
import { useSyncExternalStore } from "react";
import type { ClassLevel } from "@mastermoshai/core";

let level: ClassLevel = "CLASS_9_10";
const subs = new Set<() => void>();

export function setLevel(l: ClassLevel) {
  level = l;
  subs.forEach((f) => f());
}

export function useLevel(): ClassLevel {
  return useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => level, () => level);
}
