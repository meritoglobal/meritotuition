import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AFTER_LOGIN, AUTH_LIVE, DEMO_COOKIE, isProtected, SUPABASE_KEY, SUPABASE_URL } from "@/lib/auth/config";

/** Keeps the Supabase session fresh and sends signed-out visitors to /login. */
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  let signedIn = false;

  if (AUTH_LIVE) {
    const sb = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list, headers) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => res.headers.set(k, v));
        },
      },
    });
    const { data } = await sb.auth.getClaims();
    signedIn = Boolean(data?.claims);
  } else {
    signedIn = req.cookies.has(DEMO_COOKIE);
  }

  const { pathname, search } = req.nextUrl;
  // Referral links (?ref=CODE): remember the code for 30 days; it is attached after login.
  const ref = req.nextUrl.searchParams.get("ref");
  const keepRef = (r: NextResponse) => {
    if (ref && /^[A-Za-z0-9]{4,12}$/.test(ref)) r.cookies.set("mm_ref", ref.toUpperCase(), { path: "/", maxAge: 30 * 86_400, sameSite: "lax", httpOnly: true });
    return r;
  };
  keepRef(res);
  if (!signedIn && isProtected(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return keepRef(NextResponse.redirect(url));
  }
  if (signedIn && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = AFTER_LOGIN;
    url.search = "";
    return keepRef(NextResponse.redirect(url));
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|icon.svg|apple-icon.png|manifest.webmanifest|sw.js|pdf.worker.min.mjs|offline.html|content/|favicon).*)"],
};
