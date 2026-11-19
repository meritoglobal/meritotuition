import "server-only";
import { headers } from "next/headers";
import { isStoreUA } from "./store";

/** True inside an App Store / Play Store build of the app. */
export async function inStoreApp(): Promise<boolean> {
  try {
    return isStoreUA((await headers()).get("user-agent"));
  } catch {
    return false; // no request (cron, scripts)
  }
}
