import { describe, expect, it } from "bun:test";

import {
  hostOnlyRefreshCookieClears,
  rewriteSetCookieForFrontend,
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

  it("leaves localhost cookies host-only", () => {
    const line = rewriteSetCookieForFrontend(
      "ub.refresh=abc; Path=/api; Domain=api.localhost; HttpOnly",
      "localhost",
    );
    expect(line).not.toMatch(/Domain=/i);
  });

  it("hostOnlyRefreshCookieClears expires both refresh paths without Domain", () => {
    const lines = hostOnlyRefreshCookieClears(true);
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).toContain("ub.refresh=");
      expect(line).toContain("Max-Age=0");
      expect(line).toContain("Secure");
      expect(line).not.toMatch(/Domain=/i);
    }
  });
});
