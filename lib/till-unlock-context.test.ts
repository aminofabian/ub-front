import { beforeEach, describe, expect, it } from "bun:test";

import {
  clearTillUnlockContext,
  hasTillUnlockContext,
  readTillUnlockContext,
  TILL_UNLOCK_STORAGE_KEYS,
  updateTillUnlockBranchId,
  writeTillUnlockContext,
} from "@/lib/till-unlock-context";

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

describe("till-unlock-context", () => {
  beforeEach(() => {
    const local = createMemoryStorage();
    const session = createMemoryStorage();
    globalThis.localStorage = local;
    globalThis.sessionStorage = session;
    const g = globalThis as typeof globalThis & {
      window?: Window & typeof globalThis;
    };
    if (!g.window) {
      g.window = globalThis as unknown as Window & typeof globalThis;
    }
    g.window.localStorage = local;
    g.window.sessionStorage = session;
  });

  it("write/read round-trips and normalizes email", () => {
    writeTillUnlockContext({
      email: " Cashier@Shop.COM ",
      branchId: "br-1",
      displayName: "Ada",
      userId: "u-1",
    });

    expect(hasTillUnlockContext()).toBe(true);
    expect(readTillUnlockContext()).toEqual({
      email: "cashier@shop.com",
      branchId: "br-1",
      displayName: "Ada",
      userId: "u-1",
    });
    expect(
      window.localStorage.getItem(TILL_UNLOCK_STORAGE_KEYS.email),
    ).toBe("cashier@shop.com");
    expect(
      window.sessionStorage.getItem(TILL_UNLOCK_STORAGE_KEYS.branchId),
    ).toBe("br-1");
  });

  it("returns null when required fields are missing", () => {
    window.localStorage.setItem(TILL_UNLOCK_STORAGE_KEYS.email, "a@b.c");
    expect(readTillUnlockContext()).toBeNull();
    expect(hasTillUnlockContext()).toBe(false);
  });

  it("updateTillUnlockBranchId updates both storages when context exists", () => {
    writeTillUnlockContext({
      email: "a@b.c",
      branchId: "br-1",
      displayName: "Ada",
      userId: "u-1",
    });
    updateTillUnlockBranchId("br-2");
    expect(readTillUnlockContext()?.branchId).toBe("br-2");
  });

  it("clearTillUnlockContext removes all keys", () => {
    writeTillUnlockContext({
      email: "a@b.c",
      branchId: "br-1",
      displayName: "Ada",
      userId: "u-1",
    });
    clearTillUnlockContext();
    expect(hasTillUnlockContext()).toBe(false);
    expect(
      window.localStorage.getItem(TILL_UNLOCK_STORAGE_KEYS.email),
    ).toBeNull();
    expect(
      window.sessionStorage.getItem(TILL_UNLOCK_STORAGE_KEYS.userId),
    ).toBeNull();
  });
});
