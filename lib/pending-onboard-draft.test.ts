import { describe, expect, it, beforeEach } from "bun:test";

import {
  clearPendingOnboardDraft,
  readPendingOnboardDraft,
  savePendingOnboardDraft,
} from "@/lib/pending-onboard-draft";

function installMemoryStorage() {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: memory },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memory,
  });
}

describe("pending onboard draft", () => {
  beforeEach(() => {
    installMemoryStorage();
    clearPendingOnboardDraft();
  });

  it("round-trips a draft", () => {
    savePendingOnboardDraft({
      tenantId: "biz-1",
      slug: "coolmart",
      name: "Cool Mart",
      countryCode: "ke",
    });
    const draft = readPendingOnboardDraft();
    expect(draft?.tenantId).toBe("biz-1");
    expect(draft?.slug).toBe("coolmart");
    expect(draft?.name).toBe("Cool Mart");
    expect(draft?.countryCode).toBe("KE");
  });

  it("clears on demand", () => {
    savePendingOnboardDraft({
      tenantId: "biz-1",
      slug: "coolmart",
      name: "Cool Mart",
      countryCode: "KE",
    });
    clearPendingOnboardDraft();
    expect(readPendingOnboardDraft()).toBeNull();
  });
});
