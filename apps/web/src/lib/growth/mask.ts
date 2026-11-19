/**
 * Hides contact details in chat so tutors and families keep talking (and paying)
 * through Mastermoshai. Catches phone numbers in English or Bangla digits, even
 * when spaced or dotted, emails, links, and handles for WhatsApp/IMO/Telegram/Facebook.
 * Pure and safe on server and client.
 */
const BN = "০১২৩৪৫৬৭৮৯";
const toAscii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));

const PHONE = /(?:\+?\s*8\s*8[\s.\-]*)?0?\s*1[\s.\-]*[3-9](?:[\s.\-]*\d){8}/g;
const LONG_DIGITS = /\d(?:[\s.\-]*\d){7,}/g;
const EMAIL = /[\w.+-]+\s*(?:@|\(at\)|\[at\])\s*[\w-]+\s*(?:\.|\(dot\))\s*[a-z]{2,}/gi;
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|net|org|me|io|bd|xyz|link|ly)(?:\/\S*)?/gi;
const APPS = /\b(?:whats\s*app|whatsapp|wa\.me|imo|telegram|t\.me|viber|messenger|fb\.com|facebook|insta(?:gram)?|signal)\b|হোয়াটস\s*অ্যাপ|হোয়াটসঅ্যাপ|ইমো|টেলিগ্রাম|মেসেঞ্জার|ফেসবুক/gi;

export const HIDDEN = "[•••]";

export function maskContacts(text: string): { text: string; masked: boolean } {
  // Work on a copy with ASCII digits so Bangla numbers are caught, then map positions back.
  const ascii = toAscii(text);
  const hits: [number, number][] = [];
  for (const re of [EMAIL, LINK, PHONE, LONG_DIGITS, APPS]) {
    re.lastIndex = 0;
    for (const m of ascii.matchAll(re)) hits.push([m.index!, m.index! + m[0].length]);
  }
  if (!hits.length) return { text, masked: false };
  hits.sort((a, b) => a[0] - b[0]);
  let out = "", at = 0;
  for (const [s, e] of hits) {
    if (e <= at) continue;
    out += text.slice(at, Math.max(at, s)) + HIDDEN;
    at = e;
  }
  return { text: out + text.slice(at), masked: true };
}
