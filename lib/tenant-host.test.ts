import { describe, expect, it } from "bun:test";

import {
  cookieDomainForHost,
  isSameSiteHandoffOrigin,
  stripLeadingWww,
  tenantHostsMatch,
} from "@/lib/tenant-host";

describe("tenant-host", () => {
  it("stripLeadingWww removes www prefix", () => {
    expect(stripLeadingWww("www.palmart.co.ke")).toBe("palmart.co.ke");
    expect(stripLeadingWww("palmart.co.ke")).toBe("palmart.co.ke");
  });

  it("tenantHostsMatch ignores www", () => {
    expect(tenantHostsMatch("www.palmart.co.ke", "palmart.co.ke")).toBe(true);
  });

  it("cookieDomainForHost returns parent domain for ccTLD hosts", () => {
    expect(cookieDomainForHost("www.palmart.co.ke")).toBe(".palmart.co.ke");
    expect(cookieDomainForHost("palmart.co.ke")).toBe(".palmart.co.ke");
    expect(cookieDomainForHost("shop.kiosk.ke")).toBe(".kiosk.ke");
    expect(cookieDomainForHost("kiosk.ke")).toBe(".kiosk.ke");
    expect(cookieDomainForHost("localhost")).toBe("");
  });

  it("isSameSiteHandoffOrigin allows apex ↔ shop subdomain", () => {
    expect(
      isSameSiteHandoffOrigin("https://shop.kiosk.ke", "kiosk.ke"),
    ).toBe(true);
    expect(
      isSameSiteHandoffOrigin("https://evil.example", "kiosk.ke"),
    ).toBe(false);
    expect(
      isSameSiteHandoffOrigin("http://myshop.localhost:3000", "localhost"),
    ).toBe(true);
  });
});
