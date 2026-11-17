import Constants from "expo-constants";
import { router } from "expo-router";

export const SITE = ((Constants.expoConfig?.extra as { siteUrl?: string } | undefined)?.siteUrl ?? "https://mastermoshai.netlify.app").replace(/\/$/, "");

/**
 * Open a page of the website inside the app, under a native header.
 * Used for the parts that live on the server (login, booking, live class, sheets),
 * so the app and the site never drift apart.
 */
export function openPage(path: string, title: string) {
  router.push({ pathname: "/web", params: { path, title } });
}

/**
 * Tuition requests and bids live on the server once it ships them.
 * Until /api/requests answers on the site, the app keeps its own demo screens.
 */
let live = false;
const ctl = new AbortController();
const timer = setTimeout(() => ctl.abort(), 6000);
fetch(`${SITE}/api/requests/prefs`, { signal: ctl.signal })
  .then((r) => {
    live = r.status !== 404 && !(r.headers.get("content-type") ?? "").includes("text/html");
  })
  .catch(() => {})
  .finally(() => clearTimeout(timer));

/** Open the server page when the feature is live there, otherwise the in-app demo screen. */
export function openLive(path: string, title: string, demo: string) {
  if (live) openPage(path, title);
  else router.push(demo as never);
}
