import { describe, expect, it } from "bun:test";

import type {
  SaBusinessRow,
  SaSupportPresencePayload,
} from "@/lib/super-admin-api";

import {
  DEFAULT_FILTERS,
  buildPresenceIndex,
  filterTenants,
  filtersAreDefault,
  filtersFromSearch,
  filtersToSearch,
  formatAgo,
  isNewTenant,
  matchesQuery,
  segmentCounts,
  sortTenants,
  whatsappHref,
} from "./tenant-filters";

const NOW = Date.parse("2026-11-05T12:00:00Z");
const MIN = 60_000;
const DAY = 86_400_000;

function row(id: string, over: Partial<SaBusinessRow> = {}): SaBusinessRow {
  return {
    id,
    name: `Shop ${id}`,
    slug: `shop-${id}`,
    currency: "KES",
    countryCode: "KE",
    timezone: "Africa/Nairobi",
    active: true,
    subscriptionTier: "starter",
    createdAt: new Date(NOW - 30 * DAY).toISOString(),
    updatedAt: new Date(NOW - 30 * DAY).toISOString(),
    ...over,
  };
}

function payload(
  over: Partial<SaSupportPresencePayload> = {},
): SaSupportPresencePayload {
  return {
    presence: {},
    guestPresence: {},
    tenantsOnline: 0,
    visitorsOnline: 0,
    tenantsOnSupport: 0,
    visitorsOnSupport: 0,
    ...over,
  };
}

// a is on the app with two connections and in the support chat, b has one
// connection, c left ten minutes ago, d has never been seen.
const live = buildPresenceIndex(
  payload({
    tenantsOnline: 2,
    tenantSessions: { a: 2, b: 1 },
    tenantLastSeen: {
      a: new Date(NOW - MIN).toISOString(),
      b: new Date(NOW - 2 * MIN).toISOString(),
      c: new Date(NOW - 10 * MIN).toISOString(),
    },
    presence: {
      a: { online: true, lastSeenAt: new Date(NOW - MIN).toISOString() },
      c: { online: false, lastSeenAt: "" },
    },
  }),
);
const rows = [row("a"), row("b"), row("c"), row("d")];
const ctx = { stuckIds: new Set(["d"]), presence: live, now: NOW };

describe("buildPresenceIndex", () => {
  it("marks every tenant with an open connection online", () => {
    expect(live.perTenant).toBe(true);
    expect(live.byId.get("a")).toMatchObject({
      online: true,
      onSupport: true,
      sessions: 2,
    });
    expect(live.byId.get("b")).toMatchObject({
      online: true,
      onSupport: false,
      sessions: 1,
    });
    expect(live.byId.get("c")?.online).toBe(false);
    expect(live.byId.get("c")?.lastSeenAt).toBe(NOW - 10 * MIN);
    expect(live.byId.get("d")).toBeUndefined();
  });

  it("falls back to the support channel when the API only sends totals", () => {
    const old = buildPresenceIndex(
      payload({
        tenantsOnline: 5,
        presence: { a: { online: true, lastSeenAt: "" } },
      }),
    );
    expect(old.perTenant).toBe(false);
    expect(old.totalOnline).toBe(5);
    expect(old.byId.get("a")?.online).toBe(true);
  });

  it("treats no payload as nobody online", () => {
    expect(buildPresenceIndex(null).byId.size).toBe(0);
  });
});

describe("filterTenants", () => {
  const ids = (list: SaBusinessRow[]) => list.map((r) => r.id);

  it("filters by presence", () => {
    expect(
      ids(filterTenants(rows, { ...DEFAULT_FILTERS, presence: "online" }, ctx)),
    ).toEqual(["a", "b"]);
    expect(
      ids(filterTenants(rows, { ...DEFAULT_FILTERS, presence: "support" }, ctx)),
    ).toEqual(["a"]);
    expect(
      ids(filterTenants(rows, { ...DEFAULT_FILTERS, presence: "offline" }, ctx)),
    ).toEqual(["c", "d"]);
  });

  it("combines presence with status and plan", () => {
    const withPlans = [
      row("a", { subscriptionTier: "growth" }),
      row("b", { active: false }),
      row("c"),
      row("d"),
    ];
    expect(
      ids(
        filterTenants(
          withPlans,
          { ...DEFAULT_FILTERS, presence: "online", status: "active" },
          ctx,
        ),
      ),
    ).toEqual(["a"]);
    expect(
      ids(filterTenants(withPlans, { ...DEFAULT_FILTERS, tier: "Growth" }, ctx)),
    ).toEqual(["a"]);
    expect(
      ids(filterTenants(withPlans, { ...DEFAULT_FILTERS, status: "stuck" }, ctx)),
    ).toEqual(["d"]);
  });

  it("finds a phone number however it is typed", () => {
    const owner = row("p", { ownerPhone: "+254712345678" });
    expect(matchesQuery(owner, "0712 345 678")).toBe(true);
    expect(matchesQuery(owner, "712345")).toBe(true);
    expect(matchesQuery(owner, "0799")).toBe(false);
  });
});

describe("sortTenants", () => {
  it("puts online tenants first, busiest first", () => {
    expect(sortTenants(rows, "online", ctx).map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("ranks offline tenants by when they were last seen", () => {
    const swapped = buildPresenceIndex(
      payload({
        tenantSessions: { d: 1 },
        tenantLastSeen: {
          a: new Date(NOW - 9 * MIN).toISOString(),
          b: new Date(NOW - 3 * MIN).toISOString(),
        },
      }),
    );
    const out = sortTenants(rows, "seen", { ...ctx, presence: swapped });
    expect(out.map((r) => r.id)).toEqual(["d", "b", "a", "c"]);
  });

  it("sorts newest first and by name", () => {
    const dated = [
      row("old", { name: "Zawadi", createdAt: new Date(NOW - 9 * DAY).toISOString() }),
      row("new", { name: "Amani", createdAt: new Date(NOW - DAY).toISOString() }),
    ];
    expect(sortTenants(dated, "newest", ctx).map((r) => r.id)).toEqual([
      "new",
      "old",
    ]);
    expect(sortTenants(dated, "name", ctx).map((r) => r.id)).toEqual([
      "new",
      "old",
    ]);
  });
});

describe("counts", () => {
  it("counts each segment once", () => {
    const list = [row("a"), row("b", { active: false }), row("c"), row("d")];
    expect(segmentCounts(list, ctx)).toEqual({
      all: 4,
      active: 3,
      inactive: 1,
      stuck: 1,
      fresh: 0,
      online: 2,
      support: 1,
      offline: 2,
      sessions: 3,
    });
  });

  it("calls a tenant new for a week", () => {
    const at = (days: number) =>
      row("x", { createdAt: new Date(NOW - days * DAY).toISOString() });
    expect(isNewTenant(at(6), NOW)).toBe(true);
    expect(isNewTenant(at(8), NOW)).toBe(false);
  });
});

describe("address bar state", () => {
  it("round-trips the filters", () => {
    const filters = {
      query: "palmart",
      presence: "online" as const,
      status: "inactive" as const,
      tier: "growth",
      sort: "seen" as const,
    };
    const query = filtersToSearch(filters);
    expect(query).toBe(
      "q=palmart&live=online&state=off&plan=growth&sort=seen",
    );
    expect(filtersFromSearch(`?${query}`)).toEqual(filters);
  });

  it("ignores values it does not know", () => {
    expect(filtersFromSearch("?live=maybe&state=weird&sort=random")).toEqual(
      DEFAULT_FILTERS,
    );
    expect(filtersToSearch(DEFAULT_FILTERS)).toBe("");
  });

  it("does not count sorting as a filter", () => {
    expect(filtersAreDefault({ ...DEFAULT_FILTERS, sort: "name" })).toBe(true);
    expect(filtersAreDefault({ ...DEFAULT_FILTERS, presence: "online" })).toBe(
      false,
    );
  });
});

describe("display helpers", () => {
  it("writes short relative times", () => {
    expect(formatAgo(NOW - 20_000, NOW)).toBe("just now");
    expect(formatAgo(NOW - 12 * MIN, NOW)).toBe("12m ago");
    expect(formatAgo(NOW - 3 * 60 * MIN, NOW)).toBe("3h ago");
    expect(formatAgo(NOW - 5 * DAY, NOW)).toBe("5d ago");
    expect(formatAgo(null, NOW)).toBe("—");
  });

  it("builds WhatsApp links for Kenyan and international numbers", () => {
    expect(whatsappHref("0712 345 678")).toBe("https://wa.me/254712345678");
    expect(whatsappHref("+254 712 345 678")).toBe("https://wa.me/254712345678");
    expect(whatsappHref("712345678")).toBe("https://wa.me/254712345678");
    expect(whatsappHref("+1 415 555 0100")).toBe("https://wa.me/14155550100");
    expect(whatsappHref("12345")).toBeNull();
    expect(whatsappHref("")).toBeNull();
    expect(whatsappHref(null)).toBeNull();
  });
});
