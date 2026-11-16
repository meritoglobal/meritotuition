/**
 * Small saved settings: who is using the app (student or teacher) and the
 * student's class level. Kept in a JSON file in app storage, so the choice
 * survives restarts (moves to the account once login is wired in).
 */
import { useSyncExternalStore } from "react";
import type { ClassLevel } from "@mastermoshai/core";

export type Role = "student" | "teacher";
type Prefs = { role: Role | null; level: ClassLevel };

let prefs: Prefs = { role: null, level: "CLASS_9_10" };
const subs = new Set<() => void>();

function file() {
  try {
    const { File, Paths } = require("expo-file-system") as typeof import("expo-file-system");
    return new File(Paths.document, "prefs.json");
  } catch {
    return null;
  }
}

try {
  const f = file();
  if (f?.exists) prefs = { ...prefs, ...(JSON.parse(f.textSync()) as Partial<Prefs>) };
} catch {
  /* first run, or no file storage (web preview) */
}

function save(next: Partial<Prefs>) {
  prefs = { ...prefs, ...next };
  try {
    const f = file();
    if (f) { if (!f.exists) f.create(); f.write(JSON.stringify(prefs)); }
  } catch { /* keep in memory */ }
  subs.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => (subs.add(fn), () => { subs.delete(fn); });

export const setLevel = (level: ClassLevel) => save({ level });
export const setRole = (role: Role) => save({ role });
export const useLevel = () => useSyncExternalStore(subscribe, () => prefs.level, () => prefs.level);
export const useRole = () => useSyncExternalStore(subscribe, () => prefs.role, () => prefs.role);
