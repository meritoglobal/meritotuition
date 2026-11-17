"use server";
import { redirect } from "next/navigation";
import { DATA_LIVE } from "@/lib/data";
import { PAY_ON, startPayment } from "@/lib/growth/pay";
import { me } from "@/lib/growth/people";
import { PRO_PRICE } from "@/lib/growth/pro";
import { getProfile } from "@/lib/batches";

export async function buyPro() {
  const m = await me();
  if (!m || !DATA_LIVE || !PAY_ON) redirect("/teach/pro?paid=0");
  if (!(await getProfile(m.user.id))) redirect("/teach/profile");
  const { url } = await startPayment({ purpose: "PRO", refId: m.user.id, payer: m.email, listPrice: PRO_PRICE });
  redirect(url);
}
