import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { DATA_LIVE } from "@/lib/data";
import { fileUrl } from "@/lib/growth/intro-video";

export const dynamic = "force-dynamic";

/** GET → 302 to a 1-hour link of the tutor's uploaded intro video (public). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!DATA_LIVE) return fail("data-off", 503);
  const url = await fileUrl(decodeURIComponent((await params).id));
  if (!url) return fail("not-found", 404);
  return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "private, max-age=1800" } });
}
