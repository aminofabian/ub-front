import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  WEB_CART_STORAGE_KEY,
  clearWebCartHandle,
  readWebCartHandle,
  writeWebCartHandle,
} from "@/lib/web-cart";

describe("web-cart storage", () => {
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

  afterEach(() => {
    clearWebCartHandle();
  });

  it("round-trips slug and cart id", () => {
    writeWebCartHandle("acme", "cart-1");
    expect(readWebCartHandle()).toEqual({ slug: "acme", cartId: "cart-1" });
    expect(store[WEB_CART_STORAGE_KEY]).toContain("acme");
  });

  it("clears stored handle", () => {
    writeWebCartHandle("acme", "cart-1");
    clearWebCartHandle();
    expect(readWebCartHandle()).toBeNull();
  });

  it("returns null for invalid json", () => {
    store[WEB_CART_STORAGE_KEY] = "{";
    expect(readWebCartHandle()).toBeNull();
  });
});
