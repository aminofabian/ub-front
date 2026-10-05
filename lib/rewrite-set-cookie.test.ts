import { describe, expect, it } from "bun:test";

import {
  hostOnlyRefreshCookieClears,
  parentDomainLiveRefreshClear,
  rewriteSetCookieForFrontend,
  shouldExpireParentDomainRefresh,
} from "@/lib/rewrite-set-cookie";

describe("rewriteSetCookieForFrontend", () => {
  it("strips the API Domain and applies the frontend parent domain", () => {
    const line = rewriteSetCookieForFrontend(
      "ub.refresh=abc; Path=/api; Domain=api.kiosk.ke; HttpOnly; SameSite=Lax",
      "shop.kiosk.ke",
    );
    expect(line).not.toContain("Domain=api.kiosk.ke");
    expect(line).toContain("Domain=.kiosk.ke");
  });

  it("does not re-home a live-path refresh deletion onto the shop domain", () => {
    const line = rewriteSetCookieForFrontend(
      "ub.refresh=; Path=/api; Max-Age=0; HttpOnly; SameSite=Lax",
      "palmart.co.ke",
    );
    expect(line).toContain("Max-Age=0");
    expect(line).toContain("Path=/api");
    expect(line).not.toMatch(/Domain=/i);
  });

  it("still re-homes a legacy-path refresh deletion", () => {
    const line = rewriteSetCookieForFrontend(
      "ub.refresh=; Path=/api/v1/auth; Max-Age=0; HttpOnly; SameSite=Lax; Domain=api.kiosk.ke",
      "palmart.co.ke",
    );
    expect(line).toContain("Path=/api/v1/auth");
    expect(line).toContain("Domain=.palmart.co.ke");
  });

  it("leaves localhost cookies host-only", () => {
    const line = rewriteSetCookieForFrontend(
      "ub.refresh=abc; Path=/api; Domain=api.localhost; HttpOnly",
      "localhost",
    );
    expect(line).not.toMatch(/Domain=/i);
  });

  it("expires the parent-domain refresh cookie when logout only deletes it", () => {
    const cookies = [
      "ub.refresh=; Path=/api; Max-Age=0; HttpOnly; SameSite=Lax",
      "ub.refresh=; Path=/api/v1/auth; Max-Age=0; HttpOnly; SameSite=Lax",
    ];
    expect(shouldExpireParentDomainRefresh(cookies)).toBe(true);
    const line = parentDomainLiveRefreshClear("shop.palmart.co.ke", true);
    expect(line).toContain("Domain=.palmart.co.ke");
    expect(line).toContain("Path=/api");
    expect(line).toContain("Max-Age=0");
    expect(line).toContain("Secure");
  });

  it("keeps the parent-domain refresh cookie when a new token is set", () => {
    expect(
      shouldExpireParentDomainRefresh([
        "ub.refresh=abc; Path=/api; HttpOnly",
        "ub.refresh=; Path=/api; Max-Age=0; HttpOnly",
      ]),
    ).toBe(false);
    expect(parentDomainLiveRefreshClear("localhost", false)).toBeNull();
  });

  it("hostOnlyRefreshCookieClears expires only the legacy path, without Domain", () => {
    const lines = hostOnlyRefreshCookieClears(true);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Path=/api/v1/auth");
    expect(lines[0]).not.toContain("Path=/api;");
    expect(lines[0]).toContain("Max-Age=0");
    expect(lines[0]).toContain("Secure");
    expect(lines[0]).not.toMatch(/Domain=/i);
  });
});
