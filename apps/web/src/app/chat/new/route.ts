import { NextResponse, type NextRequest } from "next/server";
import { DATA_LIVE } from "@/lib/data";
import { canChat, openThread } from "@/lib/growth/chat";
import { isEmail, me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/** GET /chat/new?to=email → the thread with that person (created if allowed). */
export async function GET(req: NextRequest) {
  const to = (req.nextUrl.searchParams.get("to") ?? "").trim().toLowerCase();
  const m = await me();
  const url = req.nextUrl.clone();
  url.search = "";
  if (!m) {
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(`/chat/new?to=${to}`)}`;
    return NextResponse.redirect(url);
  }
  if (!DATA_LIVE || !isEmail(to) || !(await canChat(m.email, to))) {
    url.pathname = "/chat";
    url.search = "?no=1";
    return NextResponse.redirect(url);
  }
  url.pathname = `/chat/${await openThread(m.email, to)}`;
  return NextResponse.redirect(url);
}
