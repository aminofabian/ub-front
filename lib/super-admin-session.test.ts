import { beforeEach, describe, expect, it } from "bun:test";

import { STORAGE_KEYS } from "@/lib/config";
import {
  clearSuperAdminSession,
  getSuperAdminAccessToken,
  setSuperAdminAccessToken,
} from "@/lib/super-admin-session";

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

function installStorages(local: Storage, session: Storage): void {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: local,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: session,
  });
  const win =
    (globalThis as typeof globalThis & { window?: Window }).window ??
    (globalThis as unknown as Window);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: win,
  });
  Object.defineProperty(win, "localStorage", {
    configurable: true,
    value: local,
  });
  Object.defineProperty(win, "sessionStorage", {
    configurable: true,
    value: session,
  });
}

describe("super-admin-session", () => {
  beforeEach(() => {
    installStorages(createMemoryStorage(), createMemoryStorage());
  });

  it("stores the token in localStorage so a new tab stays signed in", () => {
    setSuperAdminAccessToken("sa-token");
    expect(window.localStorage.getItem(STORAGE_KEYS.superAdminAccessToken)).toBe(
      "sa-token",
    );
    expect(
      window.sessionStorage.getItem(STORAGE_KEYS.superAdminAccessToken),
    ).toBeNull();
    expect(getSuperAdminAccessToken()).toBe("sa-token");
  });

  it("migrates a leftover sessionStorage token into localStorage", () => {
    window.sessionStorage.setItem(STORAGE_KEYS.superAdminAccessToken, "legacy");
    expect(getSuperAdminAccessToken()).toBe("legacy");
    expect(window.localStorage.getItem(STORAGE_KEYS.superAdminAccessToken)).toBe(
      "legacy",
    );
    expect(
      window.sessionStorage.getItem(STORAGE_KEYS.superAdminAccessToken),
    ).toBeNull();
  });

  it("clears both stores on logout", () => {
    setSuperAdminAccessToken("sa-token");
    window.sessionStorage.setItem(STORAGE_KEYS.superAdminAccessToken, "ghost");
    clearSuperAdminSession();
    expect(getSuperAdminAccessToken()).toBeNull();
  });
});
