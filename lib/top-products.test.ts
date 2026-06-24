import { beforeEach, describe, expect, it } from "bun:test";

import {
  getTopProducts,
  recordItemUsage,
  removeTopProduct,
} from "@/lib/top-products";

describe("top-products", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const k of Object.keys(store)) {
      delete store[k];
    }
    const mockStorage = {
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
    globalThis.localStorage = mockStorage;
    const g = globalThis as typeof globalThis & { window?: Window };
    if (!g.window) {
      g.window = globalThis as unknown as Window;
    }
    g.window.localStorage = mockStorage;
  });

  it("removeTopProduct drops a frequent item row", () => {
    recordItemUsage("biz-1", { id: "item-a", name: "A", sku: "1" });
    recordItemUsage("biz-1", { id: "item-b", name: "B", sku: "2" });
    expect(getTopProducts("biz-1", 8).map((p) => p.id).sort()).toEqual([
      "item-a",
      "item-b",
    ]);
    expect(removeTopProduct("biz-1", "item-a")).toBe(true);
    expect(getTopProducts("biz-1", 8).map((p) => p.id)).toEqual(["item-b"]);
    expect(removeTopProduct("biz-1", "item-a")).toBe(false);
  });
});
