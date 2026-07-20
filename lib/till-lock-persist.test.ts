import { beforeEach, describe, expect, it } from "bun:test";

import {
  clearPersistedTillLock,
  readPersistedTillLock,
  TILL_LOCK_STORAGE_KEY,
  writePersistedTillLock,
} from "@/lib/till-lock-persist";

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

describe("till-lock-persist", () => {
  beforeEach(() => {
    const local = createMemoryStorage();
    const session = createMemoryStorage();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: local,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: session,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
  });

  it("round-trips lock state", () => {
    expect(readPersistedTillLock()).toBeNull();
    writePersistedTillLock("idle");
    expect(readPersistedTillLock()).toEqual({ locked: true, reason: "idle" });
    expect(localStorage.getItem(TILL_LOCK_STORAGE_KEY)).toContain("idle");
    clearPersistedTillLock();
    expect(readPersistedTillLock()).toBeNull();
  });
});
