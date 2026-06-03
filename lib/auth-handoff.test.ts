import { describe, expect, it } from "bun:test";

import {
  AUTH_HANDOFF_TTL_MS,
  bufferAuthHandoffFragment,
  clearAuthHandoffFragment,
  consumeAuthHandoffFragment,
  decodeAuthHandoffPayload,
  encodeAuthHandoffPayload,
  peekAuthHandoffFragment,
} from "./auth-handoff";

function withSessionStorage(run: () => void): void {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  const previous = globalThis.sessionStorage;
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: storage },
  });
  try {
    run();
  } finally {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: previous,
    });
  }
}

describe("auth-handoff", () => {
  it("roundtrips payload", () => {
    const payload = {
      accessToken: "a.b.c",
      refreshToken: "d.e.f",
      tenantId: "550e8400-e29b-41d4-a716-446655440000",
      nextPath: "/business",
    };
    const enc = encodeAuthHandoffPayload(payload);
    expect(decodeAuthHandoffPayload(enc)).toEqual(payload);
  });

  it("rejects garbage", () => {
    expect(decodeAuthHandoffPayload("")).toBeNull();
    expect(decodeAuthHandoffPayload("!!!")).toBeNull();
  });

  it("accepts access-only handoff payload", () => {
    const enc = encodeAuthHandoffPayload({
      accessToken: "a.b.c",
      nextPath: "/business",
    });
    expect(decodeAuthHandoffPayload(enc)).toEqual({
      accessToken: "a.b.c",
      nextPath: "/business",
    });
  });

  it("buffers and consumes fragment within TTL", () => {
    withSessionStorage(() => {
      sessionStorage.clear();
      bufferAuthHandoffFragment("abc123");
      expect(peekAuthHandoffFragment()).toBe("abc123");
      expect(consumeAuthHandoffFragment()).toBe("abc123");
      expect(peekAuthHandoffFragment()).toBeNull();
    });
  });

  it("expires buffered fragment after TTL", () => {
    withSessionStorage(() => {
      sessionStorage.clear();
      sessionStorage.setItem(
        "ub.authHandoffFragment",
        JSON.stringify({
          fragment: "stale",
          storedAt: Date.now() - AUTH_HANDOFF_TTL_MS - 1,
        }),
      );
      expect(peekAuthHandoffFragment()).toBeNull();
      clearAuthHandoffFragment();
    });
  });
});
