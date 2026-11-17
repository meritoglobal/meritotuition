"use server";
import { revalidatePath } from "next/cache";
import { DATA_LIVE } from "@/lib/data";
import { complain } from "@/lib/biz/complaints";
import { me } from "@/lib/growth/people";

export type ComplainState = { ok?: "REFUNDED" | "REVIEW"; refund?: number; error?: string } | null;

export async function complainAction(sessionId: string, _: ComplainState, f: FormData): Promise<ComplainState> {
  const m = await me();
  if (!m || !DATA_LIVE) return { error: "db" };
  const r = await complain({ email: m.email, sessionId, reason: String(f.get("reason") ?? ""), details: String(f.get("details") ?? "") });
  if ("error" in r) return { error: r.error };
  revalidatePath("/dashboard/student");
  return { ok: r.status, refund: r.refund };
}
