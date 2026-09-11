import { describe, expect, it } from "bun:test";

import { PLATFORM_DOMAIN } from "@/lib/config";
import {
  buildShopperPwaManifest,
  isShopperPwaHost,
  parseShopperPwaIconSize,
  shopperPwaHandoffUrl,
  shopperPwaIconPath,
  shopperPwaId,
  shopperPwaManifestPath,
  shopperPwaPath,
  shopperPwaShortName,
  shopperPwaStartUrl,
} from "@/lib/shopper-pwa";

describe("shopper PWA identity", () => {
  it("keys the installed app by slug, not the platform name", () => {
    expect(shopperPwaId("palmart")).toBe("/pwa/palmart");
    expect(shopperPwaPath("palmart")).toBe("/pwa/palmart");
    expect(shopperPwaManifestPath("palmart")).toBe(
      "/pwa/palmart/manifest.webmanifest",
    );
    expect(shopperPwaIconPath("palmart", 512, "maskable")).toBe(
      "/pwa/palmart/icon/512?purpose=maskable",
    );
  });

  it("shortens long shop names for the home-screen label", () => {
    expect(shopperPwaShortName("Palmart")).toBe("Palmart");
    expect(shopperPwaShortName("Westlands Fresh Market")).toBe("Westlands F…");
  });

  it("opens the shop home on a tenant host and /shop on the platform", () => {
    expect(shopperPwaStartUrl(true)).toBe("/?utm_source=pwa");
    expect(shopperPwaStartUrl(false)).toBe("/shop");
  });

  it("accepts only installable PNG sizes", () => {
    expect(parseShopperPwaIconSize("512.png")).toBe(512);
    expect(parseShopperPwaIconSize("180")).toBe(180);
    expect(parseShopperPwaIconSize("64")).toBe(null);
  });
});

describe("shopper PWA host", () => {
  it("treats the assigned subdomain and a mapped custom domain as this shop", () => {
    expect(
      isShopperPwaHost({
        slug: "palmart",
        currentHost: "palmart.kiosk.ke",
      }),
    ).toBe(true);
    expect(
      isShopperPwaHost({
        slug: "palmart",
        tenantHost: "shop.palmart.co.ke",
        currentHost: "shop.palmart.co.ke",
      }),
    ).toBe(true);
    expect(
      isShopperPwaHost({
        slug: "palmart",
        currentHost: PLATFORM_DOMAIN,
      }),
    ).toBe(false);
  });

  it("hands the platform apex off onto the shop origin", () => {
    const url = shopperPwaHandoffUrl({
      slug: "palmart",
      tenantHost: "palmart.kiosk.ke",
      currentHost: "kiosk.ke",
    });
    expect(url).toMatch(
      /^https?:\/\/palmart\.kiosk\.ke(?::\d+)?\/pwa\/palmart$/,
    );
  });

  it("does not bounce a visitor already on the shop host", () => {
    expect(
      shopperPwaHandoffUrl({
        slug: "palmart",
        tenantHost: "palmart.kiosk.ke",
        currentHost: "palmart.kiosk.ke",
      }),
    ).toBeNull();
  });

  it("sends bare localhost to the slug.localhost origin", () => {
    const url = shopperPwaHandoffUrl({
      slug: "palmart",
      tenantHost: "palmart.kiosk.ke",
      currentHost: "localhost",
    });
    expect(url).toMatch(/^https?:\/\/palmart\.localhost(?::\d+)?\/pwa\/palmart$/);
  });
});

describe("buildShopperPwaManifest", () => {
  it("brands Palmart as Palmart, with a unique id and PNG icons", () => {
    const manifest = buildShopperPwaManifest({
      slug: "palmart",
      name: "Palmart",
      themeColor: "#C41E3A",
      onTenantHost: true,
    });
    expect(manifest.id).toBe("/pwa/palmart");
    expect(manifest.name).toBe("Palmart");
    expect(manifest.short_name).toBe("Palmart");
    expect(manifest.theme_color).toBe("#C41E3A");
    expect(manifest.start_url).toBe("/?utm_source=pwa");
    expect(manifest.icons.every((icon) => icon.type === "image/png")).toBe(
      true,
    );
    expect(manifest.shortcuts.map((s) => s.url)).toEqual([
      "/",
      "/shop/cart",
      "/shop/account",
    ]);
  });
});
