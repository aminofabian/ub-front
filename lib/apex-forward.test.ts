import { describe, expect, it } from "bun:test";

import {
  apexShopSearchQuery,
  buildApexForwardUrl,
  isValidTenantHost,
  resolveApexShopOrigin,
} from "@/lib/apex-forward";

describe("isValidTenantHost", () => {
  it("accepts bare tenant hostnames", () => {
    expect(isValidTenantHost("shop.kiosk.ke")).toBe(true);
    expect(isValidTenantHost("mama-njeri.co.ke")).toBe(true);
    expect(isValidTenantHost("a.example.com")).toBe(true);
    expect(isValidTenantHost("  shop.kiosk.ke  ")).toBe(true);
  });

  it("rejects schemes, paths, ports, credentials, and junk", () => {
    expect(isValidTenantHost("https://shop.kiosk.ke")).toBe(false);
    expect(isValidTenantHost("shop.kiosk.ke/path")).toBe(false);
    expect(isValidTenantHost("shop.kiosk.ke:8443")).toBe(false);
    expect(isValidTenantHost("user@shop.kiosk.ke")).toBe(false);
    expect(isValidTenantHost("//shop.kiosk.ke")).toBe(false);
    expect(isValidTenantHost("shop.kiosk.ke?x=1")).toBe(false);
    expect(isValidTenantHost("javascript:alert(1)")).toBe(false);
    expect(isValidTenantHost(".shop.kiosk.ke")).toBe(false);
    expect(isValidTenantHost("")).toBe(false);
    expect(isValidTenantHost(null)).toBe(false);
    expect(isValidTenantHost(undefined)).toBe(false);
  });
});

describe("resolveApexShopOrigin", () => {
  it("prefers the tenant's own primaryHost", () => {
    expect(
      resolveApexShopOrigin({
        slug: "acme",
        name: "Acme",
        primaryHost: "acme.shop.example.com",
      }),
    ).toBe("https://acme.shop.example.com");
  });

  it("falls back to the slug-derived origin when primaryHost is invalid or missing", () => {
    expect(
      resolveApexShopOrigin({
        slug: "acme",
        name: "Acme",
        primaryHost: "https://evil.com",
      }),
    ).toMatch(/^https?:\/\/acme\./);
    expect(
      resolveApexShopOrigin({ slug: "acme", name: "Acme", primaryHost: null }),
    ).toMatch(/^https?:\/\/acme\./);
  });

  it("returns empty for a blank slug", () => {
    expect(resolveApexShopOrigin({ slug: "  ", name: "" })).toBe("");
  });
});

describe("buildApexForwardUrl", () => {
  it("joins the tenant origin and the relative path", () => {
    expect(
      buildApexForwardUrl(
        { slug: "acme", name: "Acme", primaryHost: "acme.kiosk.ke" },
        "/login?next=/shop/account",
      ),
    ).toBe("https://acme.kiosk.ke/login?next=/shop/account");
  });

  it("returns empty when no origin can be derived", () => {
    expect(buildApexForwardUrl({ slug: "", name: "" }, "/login")).toBe("");
  });
});

describe("apexShopSearchQuery", () => {
  it("strips scheme and path from pasted URLs but keeps the full host", () => {
    expect(apexShopSearchQuery("https://mama-njeri.kiosk.ke/")).toBe(
      "mama-njeri.kiosk.ke",
    );
    expect(apexShopSearchQuery("https://www.shop.example.com")).toBe(
      "shop.example.com",
    );
  });

  it("passes plain names through trimmed", () => {
    expect(apexShopSearchQuery("  Mama Njeri Minimart  ")).toBe(
      "Mama Njeri Minimart",
    );
  });
});
