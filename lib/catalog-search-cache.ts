import type { ItemSummaryRecord } from "@/lib/api";

const CACHE_KEY = "ub_catalog_item_search_v1";
const CACHE_VERSION = 1 as const;
const TTL_MS = 5 * 60 * 1000;
const MAX_KEYS = 50;

type CacheFile = {
  v: typeof CACHE_VERSION;
  entries: Record<string, { t: number; items: ItemSummaryRecord[] }>;
};

function emptyCache(): CacheFile {
  return { v: CACHE_VERSION, entries: {} };
}

function load(): CacheFile {
  if (typeof localStorage === "undefined") {
    return emptyCache();
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return emptyCache();
    }
    const p = JSON.parse(raw) as CacheFile;
    if (p.v !== CACHE_VERSION || !p.entries || typeof p.entries !== "object") {
      return emptyCache();
    }
    return p;
  } catch {
    return emptyCache();
  }
}

function save(f: CacheFile): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  const keys = Object.keys(f.entries);
  if (keys.length > MAX_KEYS) {
    const sorted = [...keys].sort((a, b) => f.entries[a].t - f.entries[b].t);
    const drop = sorted.length - MAX_KEYS;
    for (let i = 0; i < drop; i++) {
      delete f.entries[sorted[i]];
    }
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(f));
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

export type CatalogSearchHit = {
  items: ItemSummaryRecord[];
  /** True when the entry is older than the read-through TTL. */
  stale: boolean;
};

export function readCachedItemsSearch(query: string): CatalogSearchHit | null {
  const norm = normalizeQuery(query);
  if (!norm) {
    return null;
  }
  const row = load().entries[norm];
  if (!row) {
    return null;
  }
  const stale = Date.now() - row.t > TTL_MS;
  return { items: row.items, stale };
}

export function writeCachedItemsSearch(query: string, items: ItemSummaryRecord[]): void {
  const norm = normalizeQuery(query);
  if (!norm) {
    return;
  }
  const f = load();
  f.entries[norm] = { t: Date.now(), items };
  save(f);
}
