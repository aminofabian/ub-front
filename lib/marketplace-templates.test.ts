import { beforeEach, describe, expect, it } from "bun:test";

import {
  DEFAULT_MARKETPLACE_TEMPLATE_ID,
  MARKETPLACE_TEMPLATE_STORAGE_KEY,
  parseMarketplaceTemplateId,
  readLocalMarketplaceTemplate,
  writeLocalMarketplaceTemplate,
} from "@/lib/marketplace-templates";

function createMemoryStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe("marketplace-templates", () => {
  beforeEach(() => {
    const local = createMemoryStorage();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: local,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        ...globalThis,
        localStorage: local,
        dispatchEvent: () => true,
      },
    });
    Object.defineProperty(globalThis.window, "localStorage", {
      configurable: true,
      value: local,
    });
  });

  it("defaults to shelf", () => {
    expect(parseMarketplaceTemplateId(null)).toBe(DEFAULT_MARKETPLACE_TEMPLATE_ID);
    expect(readLocalMarketplaceTemplate()).toBe("shelf");
  });

  it("accepts ledger and ignores junk", () => {
    expect(parseMarketplaceTemplateId("ledger")).toBe("ledger");
    expect(parseMarketplaceTemplateId("LEDGER")).toBe("ledger");
    expect(parseMarketplaceTemplateId("ledge")).toBe("shelf");
  });

  it("round-trips through localStorage", () => {
    writeLocalMarketplaceTemplate("ledger");
    expect(localStorage.getItem(MARKETPLACE_TEMPLATE_STORAGE_KEY)).toBe("ledger");
    expect(readLocalMarketplaceTemplate()).toBe("ledger");
  });
});
