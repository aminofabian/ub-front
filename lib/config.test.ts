import { describe, expect, it } from "bun:test";

import {
  isPlatformApexHost,
  platformApexHostname,
  PLATFORM_DOMAIN,
  slugDerivedShopUrl,
} from "@/lib/config";

describe("platform apex", () => {
  it("is always kiosk.ke, not a tenant custom domain", () => {
    expect(platformApexHostname()).toBe(PLATFORM_DOMAIN);
    expect(isPlatformApexHost("kiosk.ke")).toBe(true);
    expect(isPlatformApexHost("www.kiosk.ke")).toBe(true);
    expect(isPlatformApexHost("palmart.co.ke")).toBe(false);
    expect(isPlatformApexHost("www.palmart.co.ke")).toBe(false);
    expect(isPlatformApexHost("acme.kiosk.ke")).toBe(false);
  });
});

describe("slugDerivedShopUrl", () => {
  it("assigns shops under kiosk.ke in production-like SSR", () => {
    const url = slugDerivedShopUrl("sunrise-groceries");
    expect(url).toMatch(/^https?:\/\/sunrise-groceries\.(kiosk\.ke|localhost)/);
    expect(url).not.toContain("palmart.co.ke");
  });

  it("returns empty for a blank slug", () => {
    expect(slugDerivedShopUrl("  ")).toBe("");
  });
});
