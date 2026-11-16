"use server";
import { redirect } from "next/navigation";
import { DATA_LIVE, db } from "@/lib/data";
import { me } from "@/lib/growth/people";
import { markPaid, PAY_DEMO, resultPath, type Purpose } from "@/lib/growth/pay";

/** Test payments only (no bKash keys): mark the payment paid or failed. */
export async function finishDemo(pid: string, ok: boolean) {
  const m = await me();
  if (!m || !DATA_LIVE || !PAY_DEMO) redirect("/");
  const { data: p } = await db().from("payments").select("purpose,ref_id,payer_email,status").eq("id", pid).maybeSingle();
  if (!p || p.payer_email !== m.email) redirect("/");
  if (p.status === "CREATED") {
    if (ok) await markPaid(pid, { trx: `DEMO-${Date.now()}` });
    else await db().from("payments").update({ status: "FAILED" }).eq("id", pid);
  }
  redirect(resultPath(p.purpose as Purpose, p.ref_id, ok ? "success" : "failure"));
}
