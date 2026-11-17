"use server";
import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/batches";
import { DATA_LIVE } from "@/lib/data";
import { saveWalletNumber, setAutoPayout, withdraw } from "@/lib/biz/payout";
import { me } from "@/lib/growth/people";

export type WalletState = { ok?: "saved" | "PAID" | "QUEUED" | "FAILED"; error?: "number" | "badNumber" | "min" | "balance" | "bad" | "db" } | null;

async function tutor() {
  const m = await me();
  if (!m || !DATA_LIVE || !(await getProfile(m.user.id))) return null;
  return m;
}

export async function saveNumber(_: WalletState, f: FormData): Promise<WalletState> {
  const m = await tutor();
  if (!m) return { error: "db" };
  const n = await saveWalletNumber(m.user.id, m.email, String(f.get("number") ?? ""), f.get("auto") === "on");
  revalidatePath("/teach/wallet");
  return n ? { ok: "saved" } : { error: "badNumber" };
}

export async function takeOut(_: WalletState, f: FormData): Promise<WalletState> {
  const m = await tutor();
  if (!m) return { error: "db" };
  const raw = String(f.get("amount") ?? "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/[^\d]/g, "");
  const r = await withdraw(m.user.id, m.email, Number(raw));
  revalidatePath("/teach/wallet");
  return "error" in r ? { error: r.error } : { ok: r.status as "PAID" | "QUEUED" | "FAILED" };
}

export async function toggleAuto(on: boolean) {
  const m = await tutor();
  if (!m) return;
  await setAutoPayout(m.user.id, on);
  revalidatePath("/teach/wallet");
}
