import { NextResponse, type NextRequest } from "next/server";
import { DATA_LIVE } from "@/lib/data";
import { handleCallback } from "@/lib/growth/pay";

export const dynamic = "force-dynamic";

/** bKash sends the payer back here: ?pid=<our payment>&paymentID=…&status=success|failure|cancel */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const pid = q.get("pid") ?? "";
  let to = "/";
  if (DATA_LIVE && /^[0-9a-f-]{36}$/i.test(pid)) {
    to = await handleCallback(pid, q.get("paymentID") ?? "", q.get("status") ?? "failure").catch((e) => {
      console.error("[bkash:callback]", e);
      return "/packages?paid=0&why=failure";
    });
  }
  return NextResponse.redirect(to.startsWith("http") ? to : new URL(to, req.nextUrl.origin));
}
