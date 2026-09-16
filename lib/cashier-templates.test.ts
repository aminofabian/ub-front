import { beforeEach, describe, expect, it } from "bun:test";

import {
  clearLocalCashierTemplate,
  DEFAULT_CASHIER_TEMPLATE_ID,
  parseCashierTemplateId,
  readLocalCashierTemplate,
  readLocalCashierTemplateOrNull,
  resolveCashierTemplate,
  CASHIER_TEMPLATE_STORAGE_KEY,
  writeLocalCashierTemplate,
} from "./cashier-templates";

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

describe("cashier-templates", () => {
  beforeEach(() => {
    const local = createMemoryStorage();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: local,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    Object.defineProperty(globalThis.window, "localStorage", {
      configurable: true,
      value: local,
    });
  });

  it("parses known ids and falls back to shelf", () => {
    expect(parseCashierTemplateId("ledger")).toBe("ledger");
    expect(parseCashierTemplateId("SHELF")).toBe("shelf");
    expect(parseCashierTemplateId("nope")).toBe(DEFAULT_CASHIER_TEMPLATE_ID);
    expect(parseCashierTemplateId(null)).toBe("shelf");
  });

  it("lets an explicit device pick win over the registered till", () => {
    // A tap on this browser is deliberate, so it outranks the till's default…
    expect(
      resolveCashierTemplate({ registered: "ledger", local: "shelf" }),
    ).toBe("shelf");
    expect(
      resolveCashierTemplate({ registered: "shelf", local: "ledger" }),
    ).toBe("ledger");
    // …and a device with no pick follows the till.
    expect(
      resolveCashierTemplate({ registered: "ledger", local: null }),
    ).toBe("ledger");
    expect(
      resolveCashierTemplate({ registered: null, local: "ledger" }),
    ).toBe("ledger");
    expect(resolveCashierTemplate({})).toBe("shelf");
  });

  it("reads and writes the local preference", () => {
    expect(readLocalCashierTemplate()).toBe("shelf");
    expect(readLocalCashierTemplateOrNull()).toBeNull();
    writeLocalCashierTemplate("ledger");
    expect(localStorage.getItem(CASHIER_TEMPLATE_STORAGE_KEY)).toBe("ledger");
    expect(readLocalCashierTemplate()).toBe("ledger");
    clearLocalCashierTemplate();
    expect(readLocalCashierTemplateOrNull()).toBeNull();
    expect(readLocalCashierTemplate()).toBe("shelf");
  });
});
