import { Platform } from "react-native";

/**
 * True in builds made for the Play Store / App Store (eas.json "production" sets
 * EXPO_PUBLIC_STORE=1). Store rules: digital goods (lecture sheet packs, Tutor Pro)
 * may only be sold through Apple/Google billing, so store builds do not sell them;
 * people buy those on the website and the app simply shows what they own.
 * Tutor fees (live 1-to-1 classes with a real person) are a service and stay on bKash.
 */
export const STORE = process.env.EXPO_PUBLIC_STORE === "1";

/** Pages that sell digital goods; never opened inside a store build. */
export const DIGITAL_SALE = /\/(learn\/buy|teach\/pro|api\/content\/subscribe|api\/pro)(\/|\?|#|$)/;

/** Sent to the website so it can hide "buy" buttons in store builds. */
export const APP_AGENT = `MastermoshaiApp/1.0 (${Platform.OS}${STORE ? "; store" : ""})`;
