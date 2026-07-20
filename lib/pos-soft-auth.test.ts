import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  __resetPosSoftAuthForTests,
  effectiveSoftAuth,
  enterPosSoftAuth,
  isPosSoftAuthActive,
  leavePosSoftAuth,
  notifyPosSessionExpired,
  shouldShowPosSessionExpiredModal,
} from "@/lib/pos-soft-auth";
import {
  clearTillUnlockContext,
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

describe("pos-soft-auth", () => {
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
    Object.defineProperty(globalThis.window, "localStorage", {
      configurable: true,
      value: local,
    });
    Object.defineProperty(globalThis.window, "sessionStorage", {
      configurable: true,
      value: session,
    });
  });

  afterEach(() => {
    __resetPosSoftAuthForTests();
    clearTillUnlockContext();
  });

  it("tracks enter/leave depth", () => {
    expect(isPosSoftAuthActive()).toBe(false);
    enterPosSoftAuth();
    enterPosSoftAuth();
    expect(isPosSoftAuthActive()).toBe(true);
    leavePosSoftAuth();
    expect(isPosSoftAuthActive()).toBe(true);
    leavePosSoftAuth();
    expect(isPosSoftAuthActive()).toBe(false);
    leavePosSoftAuth();
    expect(isPosSoftAuthActive()).toBe(false);
  });

  it("effectiveSoftAuth honors explicit true and POS scope", () => {
    expect(effectiveSoftAuth()).toBe(false);
    expect(effectiveSoftAuth(true)).toBe(true);
    enterPosSoftAuth();
    expect(effectiveSoftAuth()).toBe(true);
    expect(effectiveSoftAuth(undefined)).toBe(true);
  });

  it("notifyPosSessionExpired no-ops when POS soft auth is inactive", () => {
    expect(() => notifyPosSessionExpired("should not fire")).not.toThrow();
  });

  it("hides session modal when till unlock context exists", () => {
    expect(shouldShowPosSessionExpiredModal()).toBe(true);
    writeTillUnlockContext({
      email: "a@b.c",
      branchId: "br-1",
      displayName: "Ada",
      userId: "u-1",
    });
    expect(shouldShowPosSessionExpiredModal()).toBe(false);
  });
});
