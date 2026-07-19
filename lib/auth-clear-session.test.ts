import { beforeEach, describe, expect, it } from "bun:test";

import { clearAllSessionData, clearSessionTokens, getSessionTokens } from "@/lib/auth";
import { STORAGE_KEYS } from "@/lib/config";
import {
  readSessionBootstrap,
  SESSION_BOOTSTRAP_KEYS,
  writeSessionBootstrap,
} from "@/lib/session-bootstrap";

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

describe("clearSessionTokens / clearAllSessionData", () => {
  beforeEach(() => {
    const local = createMemoryStorage();
    const session = createMemoryStorage();
    globalThis.localStorage = local;
    globalThis.sessionStorage = session;
    const g = globalThis as typeof globalThis & {
      window?: Window & typeof globalThis;
      document?: Document;
    };
    if (!g.window) {
      g.window = globalThis as unknown as Window & typeof globalThis;
    }
    g.window.localStorage = local;
    g.window.sessionStorage = session;
    Object.defineProperty(g.window, "location", {
      value: { protocol: "http:", hostname: "localhost", href: "http://localhost/" },
      configurable: true,
    });
    if (!g.document) {
      g.document = {
        cookie: "",
      } as Document;
    } else {
      g.document.cookie = "";
    }
    globalThis.fetch = (async () =>
      new Response(null, { status: 204 })) as typeof fetch;
  });

  it("clearSessionTokens removes access tokens from both storages", () => {
    window.localStorage.setItem(STORAGE_KEYS.accessToken, "local-access");
    window.sessionStorage.setItem(STORAGE_KEYS.accessToken, "session-access");
    window.localStorage.setItem(STORAGE_KEYS.refreshToken, "local-refresh");
    window.sessionStorage.setItem(STORAGE_KEYS.refreshToken, "session-refresh");

    clearSessionTokens();

    expect(window.localStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
    expect(window.sessionStorage.getItem(STORAGE_KEYS.accessToken)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.refreshToken)).toBeNull();
    expect(window.sessionStorage.getItem(STORAGE_KEYS.refreshToken)).toBeNull();
    expect(getSessionTokens()).toBeNull();
  });

  it("clearAllSessionData clears sessionStorage-only tokens and bootstrap", () => {
    // Mimic incomplete prior logout: localStorage wiped, sessionStorage left behind.
    window.sessionStorage.setItem(STORAGE_KEYS.accessToken, "ghost-access");
    window.sessionStorage.setItem(STORAGE_KEYS.refreshToken, "ghost-refresh");
    writeSessionBootstrap(SESSION_BOOTSTRAP_KEYS.me, { id: "u1", email: "a@b.c" });
    writeSessionBootstrap(SESSION_BOOTSTRAP_KEYS.business, { id: "b1" });
    writeSessionBootstrap(SESSION_BOOTSTRAP_KEYS.branches, [{ id: "br1" }]);

    expect(getSessionTokens()?.accessToken).toBe("ghost-access");
    expect(readSessionBootstrap(SESSION_BOOTSTRAP_KEYS.me)).not.toBeNull();

    clearAllSessionData();

    expect(getSessionTokens()).toBeNull();
    expect(readSessionBootstrap(SESSION_BOOTSTRAP_KEYS.me)).toBeNull();
    expect(readSessionBootstrap(SESSION_BOOTSTRAP_KEYS.business)).toBeNull();
    expect(readSessionBootstrap(SESSION_BOOTSTRAP_KEYS.branches)).toBeNull();
  });
});
