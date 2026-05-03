import { beforeEach, describe, expect, it } from "bun:test";

import { readCachedItemsSearch, writeCachedItemsSearch } from "@/lib/catalog-search-cache";

describe("catalog-search-cache", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const k of Object.keys(store)) {
      delete store[k];
    }
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) {
          delete store[k];
        }
      },
      key: () => null,
      length: 0,
    } as Storage;
  });

  it("round-trips search hits by normalized query", () => {
    writeCachedItemsSearch("  Soda ", [{ id: "1", name: "Soda", sku: "S1", active: true }]);
    const hit = readCachedItemsSearch("soda");
    expect(hit?.items).toHaveLength(1);
    expect(hit?.items[0].id).toBe("1");
  });
});
