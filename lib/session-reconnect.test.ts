import { beforeEach, describe, expect, it } from "bun:test";

import {
  __resetSessionReconnectForTests,
  beginSessionReconnect,
  clearSessionReconnect,
  isSessionEnded,
  isSessionReconnecting,
  subscribeSessionReconnect,
  type SessionReconnectState,
} from "@/lib/session-reconnect";

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

function installEnv(): void {
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

  const win = globalThis as unknown as Window;
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

/** Let the fire-and-forget verify in beginSessionReconnect settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("session-reconnect state machine", () => {
  beforeEach(() => {
    __resetSessionReconnectForTests();
    installEnv();
  });

  it("starts ok", () => {
    expect(isSessionReconnecting()).toBe(false);
    expect(isSessionEnded()).toBe(false);
  });

  it("definitive rejection jumps straight to ended", () => {
    beginSessionReconnect("test", { definitive: true });

    expect(isSessionEnded()).toBe(true);
    expect(isSessionReconnecting()).toBe(false);
  });

  it("recovers quietly when restore-session accepts the session", async () => {
    globalThis.fetch = (async () =>
      Response.json({
        session: { exp: 1_700_000_000, businessId: "biz-1", sub: "u1" },
      })) as typeof fetch;

    beginSessionReconnect("test");
    expect(isSessionReconnecting()).toBe(true);

    await flush();

    expect(isSessionReconnecting()).toBe(false);
    expect(isSessionEnded()).toBe(false);
  });

  it("ends when restore-session answers 401 (dead session)", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "no_session" }), {
        status: 401,
      })) as typeof fetch;

    beginSessionReconnect("test");
    await flush();

    expect(isSessionEnded()).toBe(true);
    expect(isSessionReconnecting()).toBe(false);
  });

  it("stays reconnecting on network failure (never ends on a blip)", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("network down");
    }) as typeof fetch;

    beginSessionReconnect("test");
    await flush();

    expect(isSessionReconnecting()).toBe(true);
    expect(isSessionEnded()).toBe(false);
  });

  it("clearSessionReconnect returns to ok", () => {
    beginSessionReconnect("test", { definitive: true });
    expect(isSessionEnded()).toBe(true);

    clearSessionReconnect();

    expect(isSessionEnded()).toBe(false);
    expect(isSessionReconnecting()).toBe(false);
  });

  it("notifies subscribers and stops on unsubscribe", () => {
    const seen: SessionReconnectState[] = [];
    const unsubscribe = subscribeSessionReconnect((state) => seen.push(state));

    beginSessionReconnect("test", { definitive: true });
    expect(seen).toContain("ended");

    unsubscribe();
    beginSessionReconnect("test");
    expect(seen).not.toContain("reconnecting");
  });
});
