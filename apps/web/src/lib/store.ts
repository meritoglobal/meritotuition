/**
 * App Store / Play Store builds wrap this site and send a user agent containing
 * "MastermoshaiApp/1.0 (ios; store)" or "(android; store)". Store rules forbid selling
 * digital goods (content packs, Tutor Pro, paid model tests) outside in-app purchase, and
 * forbid pointing to the website to buy them. So in a store build those are hidden and
 * blocked. Tutoring packages (a real person teaching) stay: that is a person-to-person service.
 */
export const isStoreUA = (ua: string | null | undefined) => Boolean(ua && /MastermoshaiApp\/[^\s]*\s*\([^)]*;\s*store\s*\)/i.test(ua));

/** Payment purposes that are digital goods. */
export const DIGITAL_PURPOSES = ["CONTENT", "PRO", "TEST"] as const;

/** Paths that only sell digital goods: a store build is sent elsewhere. */
export const STORE_BLOCKED: [prefix: string, to: string][] = [["/learn/buy", "/learn"], ["/teach/pro", "/teach"]];
