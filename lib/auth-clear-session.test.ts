import { beforeEach, describe, expect, it } from "bun:test";

import {
  __resetMemoryAccessTokenForTests,
  applyAuthSessionPayload,
  clearAllSessionData,
  clearSessionTokens,
  getSessionTokens,
  hasAccessSession,
  setSessionTokens,
} from "@/lib/auth";
import { STORAGE_KEYS } from "@/lib/config";
import {
  readSessionBootstrap,
  SESSION_BOOTSTRAP_KEYS,
  writeSessionBootstrap,
} from "@/lib/session-bootstrap";
import {
  readPersistedTillLock,
  writePersistedTillLock,
} from "@/lib/till-lock-persist";
import {
  hasTillUnlockContext,
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
  Object.defineProperty(win, "location", {
    configurable: true,
    value: {
      protocol: "http:",
      hostname: "localhost",
      href: "http://localhost/",
    },
  });

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie: "" },
  });
  Object.defineProperty(win, "document", {
    configurable: true,
    value: (globalThis as typeof globalThis & { document: Document }).document,
  });
}

describe("clearSessionTokens / clearAllSessionData", () => {
  beforeEach(() => {
    __resetMemoryAccessTokenForTests();
    installStorages(createMemoryStorage(), createMemoryStorage());
    globalThis.fetch = (async () =>
      new Response(null, { status: 204 })) as typeof fetch;
  });

  it("setSessionTokens keeps access in memory and purges web storage", () => {
    window.localStorage.setItem(STORAGE_KEYS.accessToken, "legacy");
    setSessionTokens({ accessToken: "mem-access" });

    expect(getSessionTokens()?.accessToken).toBe("mem-access");
    expect(window.localStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
    expect(window.sessionStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
  });

  it("clearSessionTokens clears memory and legacy storage", () => {
    setSessionTokens({ accessToken: "mem-access" });
    window.localStorage.setItem(STORAGE_KEYS.accessToken, "ghost");

    clearSessionTokens();

    expect(getSessionTokens()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
  });

  it("adopts legacy storage access into memory once", () => {
    window.sessionStorage.setItem(STORAGE_KEYS.accessToken, "ghost-access");
    expect(getSessionTokens()?.accessToken).toBe("ghost-access");
    expect(window.sessionStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
  });

  it("applyAuthSessionPayload accepts claims-only (cookie-only) sessions", () => {
    expect(
      applyAuthSessionPayload({
        session: { exp: 1_700_000_000, businessId: "biz-1" },
      }),
    ).toBe(true);
    expect(hasAccessSession()).toBe(true);
    expect(getSessionTokens()).toBeNull();
  });

  it("clearAllSessionData clears bootstrap and till unlock context", () => {
    setSessionTokens({ accessToken: "mem-access" });
    writeSessionBootstrap(SESSION_BOOTSTRAP_KEYS.me, {
      id: "u1",
      email: "a@b.c",
    });
    writeSessionBootstrap(SESSION_BOOTSTRAP_KEYS.business, { id: "b1" });
    writeSessionBootstrap(SESSION_BOOTSTRAP_KEYS.branches, [{ id: "br1" }]);
    writeTillUnlockContext({
      email: "a@b.c",
      branchId: "br1",
      displayName: "Ada",
      userId: "u1",
    });
    writePersistedTillLock("manual");

    clearAllSessionData();

    expect(getSessionTokens()).toBeNull();
    expect(readSessionBootstrap(SESSION_BOOTSTRAP_KEYS.me)).toBeNull();
    expect(readSessionBootstrap(SESSION_BOOTSTRAP_KEYS.business)).toBeNull();
    expect(readSessionBootstrap(SESSION_BOOTSTRAP_KEYS.branches)).toBeNull();
    expect(hasTillUnlockContext()).toBe(false);
    expect(readPersistedTillLock()).toBeNull();
  });
});
