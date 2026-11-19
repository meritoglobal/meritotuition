import { Platform } from "react-native";

/**
 * True in builds made for the Play Store / App Store (eas.json "production" sets
 * EXPO_PUBLIC_STORE=1). Owner's decision (Nov 19): everything, including lecture
 * sheet packs and Tutor Pro, is sold through bKash in every build. Store billing
 * is not used. If a store review rejects that, set HIDE_DIGITAL_SALES to true for
 * that platform: store builds then hide those buys and the website does the same.
 */
export const STORE = process.env.EXPO_PUBLIC_STORE === "1";
export const HIDE_DIGITAL_SALES = false;

/** Pages that sell digital goods; blocked only when HIDE_DIGITAL_SALES is on. */
export const DIGITAL_SALE = /\/(learn\/buy|teach\/pro|api\/content\/subscribe|api\/pro)(\/|\?|#|$)/;

/** The website hides digital "buy" buttons when this contains "; store". */
export const APP_AGENT = `MastermoshaiApp/1.0 (${Platform.OS}${STORE && HIDE_DIGITAL_SALES ? "; store" : ""})`;
