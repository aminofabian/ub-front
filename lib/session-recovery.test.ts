import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  __resetMemoryAccessTokenForTests,
  setSessionClaims,
  setSessionTokens,
} from "@/lib/auth";
import { PROBLEM_TITLES } from "@/lib/config";
import {
  isRefreshAlreadyRotatedProblem,
  isSessionIdleExpiredProblem,
  sessionAdvanceFingerprint,
  waitForSiblingTokenUpdate,
} from "@/lib/session-recovery";

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
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

function installWindow(): void {
  const local = createMemoryStorage();
  const session = createMemoryStorage();
  const doc = { cookie: "" };
  const win = {
    localStorage: local,
    sessionStorage: session,
    document: doc,
    location: {
      protocol: "http:",
      hostname: "localhost",
      href: "http://localhost/",
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: win,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: doc,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: local,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: session,
  });
  globalThis.fetch = (async () =>
    new Response(null, { status: 204 })) as typeof fetch;
}

describe("isRefreshAlreadyRotatedProblem", () => {
  it("matches detail from rotation grace 401", () => {
    expect(
      isRefreshAlreadyRotatedProblem({
        title: "Unauthorized",
        status: 401,
        detail: PROBLEM_TITLES.refreshAlreadyRotated,
      }),
    ).toBe(true);
  });

  it("ignores generic unauthorized", () => {
    expect(
      isRefreshAlreadyRotatedProblem({
        title: "Unauthorized",
        status: 401,
      }),
    ).toBe(false);
  });
});

describe("isSessionIdleExpiredProblem", () => {
  it("matches idle timeout detail", () => {
    expect(
      isSessionIdleExpiredProblem({
        title: "Unauthorized",
        status: 401,
        detail: PROBLEM_TITLES.sessionIdleExpired,
      }),
    ).toBe(true);
  });

  it("ignores unrelated problems", () => {
    expect(
      isSessionIdleExpiredProblem({
        title: "Session is no longer active",
        status: 401,
      }),
    ).toBe(false);
  });
});

describe("sessionAdvanceFingerprint", () => {
  it("prefers memory JWT over claims exp", () => {
    expect(sessionAdvanceFingerprint("jwt-a", 1_700_000_000)).toBe("t:jwt-a");
  });

  it("uses Gap G3 claims exp when no JWT", () => {
    expect(sessionAdvanceFingerprint(null, 1_700_000_000)).toBe(
      "c:1700000000",
    );
  });

  it("returns empty when nothing is present", () => {
    expect(sessionAdvanceFingerprint(undefined, null)).toBe("");
  });
});

describe("waitForSiblingTokenUpdate Gap G3", () => {
  beforeEach(() => {
    __resetMemoryAccessTokenForTests();
    installWindow();
  });

  afterEach(() => {
    __resetMemoryAccessTokenForTests();
  });

  it("detects claims exp advance without a memory JWT", async () => {
    setSessionClaims({ exp: 1_700_000_000, businessId: "biz-1" });
    const waited = waitForSiblingTokenUpdate(undefined, 400, 1_700_000_000);
    setTimeout(() => {
      setSessionClaims({ exp: 1_700_000_600, businessId: "biz-1" });
    }, 20);
    await expect(waited).resolves.toBe(true);
  });

  it("detects memory JWT rotation", async () => {
    setSessionTokens({ accessToken: "access-old" });
    const waited = waitForSiblingTokenUpdate("access-old", 400);
    setTimeout(() => {
      setSessionTokens({ accessToken: "access-new" });
    }, 20);
    await expect(waited).resolves.toBe(true);
  });

  it("returns false when session does not advance", async () => {
    setSessionClaims({ exp: 1_700_000_000, businessId: "biz-1" });
    await expect(
      waitForSiblingTokenUpdate(undefined, 120, 1_700_000_000),
    ).resolves.toBe(false);
  });
});
