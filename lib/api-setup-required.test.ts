import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";

import { __resetMemoryAccessTokenForTests, setSessionTokens } from "@/lib/auth";
import { POS_GUIDANCE_EVENT } from "@/lib/pos-guidance";
import {
  __resetSetupRequirementsForTests,
  currentSetupRequest,
  registerSetupHost,
  setupGapFromShiftProbe,
  setupRequiredFromError,
} from "@/lib/setup-requirements";

function memoryStorage(): Storage {
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
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

/*
 * Load a private copy of the API client. `support-api.test.ts` replaces `@/lib/api` with a stub
 * for the rest of the run (bun does not undo module mocks), which would turn these requests
 * into no-ops when the whole suite runs. The query string gives this file its own instance.
 */
const apiModulePath = "./api?setup-required";
const { apiRequest, tryPostSale } = (await import(apiModulePath)) as typeof import("@/lib/api");

const guidanceKinds: string[] = [];
const GLOBALS = ["window", "localStorage", "sessionStorage", "document"] as const;
const savedGlobals = GLOBALS.map(
  (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
);

afterAll(() => {
  for (const [name, descriptor] of savedGlobals) {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      Reflect.deleteProperty(globalThis, name);
    }
  }
});

beforeAll(() => {
  // Same shape `api.test.ts` uses: the bun runner has no DOM, so the global scope stands in
  // for `window` (it already has timers, events and fetch).
  const win = globalThis as unknown as Window;
  Object.defineProperty(globalThis, "window", { configurable: true, value: win });
  Object.defineProperty(win, "location", {
    configurable: true,
    value: { protocol: "http:", hostname: "localhost", href: "http://localhost/" },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memoryStorage(),
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: memoryStorage(),
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie: "" },
  });
  win.addEventListener(POS_GUIDANCE_EVENT, (event) => {
    guidanceKinds.push((event as CustomEvent<{ kind: string }>).detail.kind);
  });
  __resetMemoryAccessTokenForTests();
});

afterEach(() => {
  __resetSetupRequirementsForTests();
  guidanceKinds.length = 0;
});

function respondWith(body: Record<string, unknown>, status: number): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ title: "Conflict", status, ...body }), {
      status,
      headers: { "content-type": "application/problem+json" },
    })) as unknown as typeof fetch;
}

const TAGGED_SHIFT = {
  type: "urn:problem:setup-required",
  detail: "No open shift",
  code: "setup_required",
  requirement: "shift",
};

async function sell(): Promise<void> {
  await expect(
    apiRequest("/api/v1/sales", { method: "POST", requiresAuth: false, body: {} }),
  ).rejects.toThrow("No open shift");
}

describe("a tagged setup_required response", () => {
  it("opens the setup dialog instead of the old banner when a host is mounted", async () => {
    registerSetupHost();
    respondWith(TAGGED_SHIFT, 409);

    await sell();

    expect(currentSetupRequest()).toEqual({ requirement: "shift" });
    expect(guidanceKinds).toEqual([]);
  });

  it("carries the branch hint through", async () => {
    registerSetupHost();
    respondWith(
      {
        type: "urn:problem:setup-required",
        detail: "Add your first branch to continue.",
        code: "setup_required",
        requirement: "branch",
        hint: "none",
      },
      400,
    );

    await expect(
      apiRequest("/api/v1/catalog/items", { method: "POST", requiresAuth: false, body: {} }),
    ).rejects.toThrow("Add your first branch");

    expect(currentSetupRequest()).toEqual({ requirement: "branch", hint: "none" });
  });

  it("keeps the tagged problem on the error it throws, for callers that resume", async () => {
    respondWith(TAGGED_SHIFT, 409);

    const error = await apiRequest("/api/v1/shifts/current", {
      requiresAuth: false,
      toast: false,
    }).catch((e: unknown) => e);

    expect(setupRequiredFromError(error)).toEqual({ requirement: "shift" });
    expect(setupGapFromShiftProbe(error)).toEqual({ requirement: "shift" });
    // The caller asked for no toast and owns the follow-up: nothing opened on its own.
    expect(guidanceKinds).toEqual([]);
  });

  it("falls back to the old banner when no host is mounted", async () => {
    respondWith(TAGGED_SHIFT, 409);

    await sell();

    expect(currentSetupRequest()).toBeNull();
    expect(guidanceKinds).toEqual(["open-shift"]);
  });
});

describe("the same message from a server that does not tag it", () => {
  it("still uses the old banner, even with a host mounted", async () => {
    registerSetupHost();
    respondWith({ detail: "No open shift" }, 409);

    await sell();

    expect(currentSetupRequest()).toBeNull();
    expect(guidanceKinds).toEqual(["open-shift"]);
  });
});

describe("posting a sale the server turns away until something is set up", () => {
  const sale = {
    branchId: "branch-1",
    lines: [{ itemId: "item-1", quantity: 1, unitPrice: 100 }],
    payments: [{ method: "cash" as const, amount: 100 }],
  };

  beforeAll(() => {
    // `tryPostSale` insists on a signed-in session before it will send anything.
    setSessionTokens({ accessToken: "access-test" });
  });

  afterAll(() => {
    __resetMemoryAccessTokenForTests();
  });

  it("hands the requirement back so the till can ask and then try again", async () => {
    respondWith({ ...TAGGED_SHIFT, detail: "Open a shift first" }, 409);

    const result = await tryPostSale(sale, "idem-shift");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.setup).toEqual({ requirement: "shift" });
    }
  });

  it("does the same for a till that has not been registered", async () => {
    respondWith(
      { ...TAGGED_SHIFT, requirement: "till", detail: "Register this till" },
      403,
    );

    const result = await tryPostSale(sale, "idem-till");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.setup).toEqual({ requirement: "till" });
    }
  });

  it("leaves the follow-up to the screen: no dialog opens from here", async () => {
    registerSetupHost();
    respondWith(TAGGED_SHIFT, 409);

    await tryPostSale(sale, "idem-quiet");

    expect(currentSetupRequest()).toBeNull();
    expect(guidanceKinds).toEqual([]);
  });

  it("carries no requirement for a refusal the server does not tag", async () => {
    respondWith({ detail: "No open shift" }, 409);

    const result = await tryPostSale(sale, "idem-plain");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.setup).toBeUndefined();
      expect(result.message).toContain("No open shift");
    }
  });
});
