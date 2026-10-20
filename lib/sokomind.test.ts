import { describe, expect, it } from "bun:test";

import { surfaceFromPathname } from "@/lib/sokomind";

describe("guide surface mapping", () => {
  it("keeps the business hub for the hub itself", () => {
    expect(surfaceFromPathname("/business")).toBe("business.hub");
    expect(surfaceFromPathname("/business/")).toBe("business.hub");
    expect(surfaceFromPathname("/business?manageTills=1")).toBe("business.hub");
  });

  it("treats settings as settings, not the hub", () => {
    expect(surfaceFromPathname("/business/settings")).toBe("business.settings");
    expect(surfaceFromPathname("/business/settings#storefront")).toBe(
      "business.settings",
    );
  });

  it("gives the shop's look and address their own surface", () => {
    expect(surfaceFromPathname("/business/themes")).toBe("business.storefront");
    expect(surfaceFromPathname("/business/branding")).toBe(
      "business.storefront",
    );
    expect(surfaceFromPathname("/business/design")).toBe("business.storefront");
    expect(surfaceFromPathname("/business/mobile")).toBe("business.storefront");
    expect(surfaceFromPathname("/business/domains")).toBe(
      "business.storefront",
    );
  });

  it("does not stretch the storefront surface to the rest of business", () => {
    expect(surfaceFromPathname("/business/logs")).toBe("business.hub");
    expect(surfaceFromPathname("/business/pocketing")).toBe("business.hub");
    expect(surfaceFromPathname("/business/billing/renew")).toBe("business.hub");
  });

  it("still maps the rest of the app", () => {
    expect(surfaceFromPathname("/sales")).toBe("sales");
    expect(surfaceFromPathname("/products")).toBe("products.catalog");
    expect(surfaceFromPathname("/order")).toBe("ordering");
    expect(surfaceFromPathname("/payments/settings")).toBe("payments.settings");
    expect(surfaceFromPathname("/unknown-page")).toBe("app.general");
  });
});
