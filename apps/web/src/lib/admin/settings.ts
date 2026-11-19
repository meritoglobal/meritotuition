import "server-only";
import { COMMISSION_TIERS, SEGMENT_PRICE, type Tier } from "@mastermoshai/core";
import { DATA_LIVE, db } from "@/lib/data";

/** What the admin can change from /admin/settings without a code change. */
export interface Settings {
  tiers: Tier[];
  contentPrice: number;
  notice: { bn: string; en: string; tone: "info" | "warn" } | null;
}

const ENV_PRICE = (() => {
  const v = Number(process.env.CONTENT_PRICE);
  return Number.isInteger(v) && v >= 100 ? v : SEGMENT_PRICE;
})();

export const DEFAULTS: Settings = { tiers: COMMISSION_TIERS, contentPrice: ENV_PRICE, notice: null };

type TierEdit = { code: string; minStudents: number; rate: number };

/** Apply saved edits (rate, min students) on top of the built-in tier list. Bad values are ignored. */
export function mergeTiers(edits: unknown): Tier[] {
  if (!Array.isArray(edits)) return COMMISSION_TIERS;
  const by = new Map((edits as TierEdit[]).map((e) => [e?.code, e]));
  return COMMISSION_TIERS.map((t, i) => {
    const e = by.get(t.code);
    if (!e) return t;
    const rate = Number(e.rate), min = Number(e.minStudents);
    return {
      ...t,
      rate: Number.isFinite(rate) && rate >= 0 && rate <= 0.5 ? rate : t.rate,
      minStudents: i === 0 ? 0 : Number.isInteger(min) && min >= 0 && min <= 100000 ? min : t.minStudents,
    };
  });
}

let cache: { at: number; s: Settings } | null = null;

export async function getSettings(): Promise<Settings> {
  if (!DATA_LIVE) return DEFAULTS;
  if (cache && Date.now() - cache.at < 60_000) return cache.s;
  let s = DEFAULTS;
  try {
    const { data, error } = await db().from("platform_settings").select("key,value");
    if (!error) {
      const kv = new Map((data ?? []).map((r) => [r.key as string, r.value as unknown]));
      const price = Number(kv.get("content_price"));
      const n = kv.get("site_notice") as Settings["notice"] | undefined;
      s = {
        tiers: mergeTiers(kv.get("commission_tiers")),
        contentPrice: Number.isInteger(price) && price >= 100 && price <= 100000 ? price : ENV_PRICE,
        notice: n && (n.bn || n.en) ? { bn: n.bn ?? "", en: n.en ?? "", tone: n.tone === "warn" ? "warn" : "info" } : null,
      };
    }
  } catch {
    s = DEFAULTS;
  }
  cache = { at: Date.now(), s };
  return s;
}

export async function saveSetting(key: "commission_tiers" | "content_price" | "site_notice", value: unknown, by: string) {
  await db().from("platform_settings").upsert({ key, value, updated_by: by, updated_at: new Date().toISOString() });
  cache = null;
}
