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
