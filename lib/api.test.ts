import { describe, expect, it, beforeAll } from "bun:test";

import { buildRequestHeaders, shouldAttemptRefresh, apiRequest } from "@/lib/api";
import { __resetMemoryAccessTokenForTests } from "@/lib/auth";

// Tests that rely on the default tenantHostReader (which calls
// getSessionTenantHost → window.location.hostname) need a valid
// window.location in the bun test runner.
beforeAll(() => {
  if (typeof window !== "undefined" && !window.location) {
    Object.defineProperty(window, "location", {
      value: { hostname: "test.palmart.co.ke", protocol: "https:" },
      configurable: true,
      writable: true,
    });
  }
});

describe("api client helpers", () => {
  it("adds Idempotency-Key for mutating methods", () => {
    const headers = buildRequestHeaders(
      true,
      "token",
      "POST",
      () => "idempotency-key-1",
    ) as Record<string, string>;

    expect(headers["Idempotency-Key"]).toBe("idempotency-key-1");
    expect(headers.Authorization).toBe("Bearer token");
  });

  it("does not add Idempotency-Key for GET", () => {
    const headers = buildRequestHeaders(
      true,
      "token",
      "GET",
      () => "idempotency-key-2",
    ) as Record<string, string>;

    expect(headers["Idempotency-Key"]).toBeUndefined();
  });

  it("refreshes for token_expired code or invalid/expired title", () => {
    expect(shouldAttemptRefresh({ code: "token_expired" })).toBe(true);
    expect(
      shouldAttemptRefresh({ title: "Invalid or expired access token" }),
    ).toBe(true);
    expect(
      shouldAttemptRefresh({
        code: "token_expired",
        title: "Invalid or expired access token",
      }),
    ).toBe(true);
    expect(shouldAttemptRefresh({ code: "permission_denied" })).toBe(false);
    expect(shouldAttemptRefresh({ title: "Forbidden" })).toBe(false);
    expect(shouldAttemptRefresh(undefined)).toBe(false);
  });

  it("adds X-Tenant-Host when session storage has host", () => {
    const headers = buildRequestHeaders(
      true,
      "token",
      "GET",
      () => "idempotency-key-3",
      () => "tenant.example.com",
    ) as Record<string, string>;

    expect(headers["X-Tenant-Host"]).toBe("tenant.example.com");
  });

  it("does not add X-Tenant-Host when tenant host is missing", () => {
    const headers = buildRequestHeaders(
      true,
      "token",
      "GET",
      () => "idempotency-key-4",
      () => null,
    ) as Record<string, string>;

    expect(headers["X-Tenant-Host"]).toBeUndefined();
  });

  it("adds X-Tenant-Id when tenant id reader returns value", () => {
    const headers = buildRequestHeaders(
      true,
      "token",
      "GET",
      () => "idempotency-key-5",
      () => null,
      () => "550e8400-e29b-41d4-a716-446655440000",
    ) as Record<string, string>;

    expect(headers["X-Tenant-Id"]).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("does not add X-Tenant-Id when tenant id reader returns null", () => {
    const headers = buildRequestHeaders(
      true,
      "token",
      "GET",
      () => "idempotency-key-6",
      () => null,
      () => null,
    ) as Record<string, string>;

    expect(headers["X-Tenant-Id"]).toBeUndefined();
  });
});

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

describe("request 401 recovery is bounded", () => {
  it(
    "gives up after the cap when refresh is rejected but restore keeps succeeding",
    async () => {
      __resetMemoryAccessTokenForTests();
      installStorages(createMemoryStorage(), createMemoryStorage());

      const calls: { path: string; method: string }[] = [];
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input);
        const method = (init?.method ?? "GET").toUpperCase();
        calls.push({ path, method });

        // Refresh is dead (revoked refresh cookie)…
        if (path.endsWith("/api/v1/auth/refresh")) {
          return new Response(
            JSON.stringify({ title: "Invalid credentials", status: 401 }),
            { status: 401, headers: { "content-type": "application/problem+json" } },
          );
        }
        // …but cookie restore always "succeeds" from the still-valid access JWT.
        if (path.endsWith("/api/auth/restore-session")) {
          return Response.json({
            session: { exp: 1_700_000_000, businessId: "biz-1", sub: "u1" },
          });
        }
        if (path.endsWith("/api/auth/session-hint")) {
          return new Response(null, { status: 204 });
        }
        // The protected call always 401s — the session row is dead.
        return new Response(
          JSON.stringify({ title: "Session is no longer active", status: 401 }),
          { status: 401, headers: { "content-type": "application/problem+json" } },
        );
      }) as typeof fetch;

      const promise = apiRequest("/api/v1/catalog/items", {
        requiresAuth: true,
        toast: false,
      });

      // Must terminate with an error, never spin forever.
      await expect(promise).rejects.toThrow();

      const protectedCalls = calls.filter((c) =>
        c.path.endsWith("/api/v1/catalog/items"),
      );
      const refreshCalls = calls.filter((c) =>
        c.path.endsWith("/api/v1/auth/refresh"),
      );

      // Regression: without the cap this loop was unbounded (restore kept
      // "succeeding", every retry 401'd again, forever). Now it is bounded.
      expect(protectedCalls.length).toBeLessThanOrEqual(3);
      expect(refreshCalls.length).toBeLessThanOrEqual(2);
    },
    15_000,
  );
});
