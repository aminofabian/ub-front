import { describe, expect, it } from "bun:test";

import {
  storefrontStaffEditReturnPath,
  storefrontWantsEditFromSearch,
  resolveStorefrontDesignReturnTo,
} from "@/lib/storefront-staff-edit";

describe("storefrontWantsEditFromSearch", () => {
  it("accepts edit=1 / true / yes", () => {
    expect(storefrontWantsEditFromSearch("?edit=1")).toBe(true);
    expect(storefrontWantsEditFromSearch("edit=true")).toBe(true);
    expect(storefrontWantsEditFromSearch("?q=x&edit=yes")).toBe(true);
  });

  it("rejects missing or other values", () => {
    expect(storefrontWantsEditFromSearch("")).toBe(false);
    expect(storefrontWantsEditFromSearch(null)).toBe(false);
    expect(storefrontWantsEditFromSearch("?edit=0")).toBe(false);
    expect(storefrontWantsEditFromSearch("?preview=1")).toBe(false);
  });
});

describe("storefrontStaffEditReturnPath", () => {
  it("forces edit=1 onto the current path", () => {
    expect(storefrontStaffEditReturnPath("https://knox.kiosk.ke/")).toBe(
      "/?edit=1",
    );
    expect(
      storefrontStaffEditReturnPath("https://knox.kiosk.ke/shop?q=batteries"),
    ).toBe("/shop?q=batteries&edit=1");
  });
});

describe("resolveStorefrontDesignReturnTo", () => {
  const shopBase = "https://knox.kiosk.ke";

  it("accepts absolute shop URLs on the expected origin", () => {
    expect(
      resolveStorefrontDesignReturnTo(
        "https://knox.kiosk.ke/?edit=1",
        shopBase,
      ),
    ).toBe("https://knox.kiosk.ke/?edit=1");
  });

  it("joins relative shop paths to the shop base", () => {
    expect(resolveStorefrontDesignReturnTo("/?edit=1", shopBase)).toBe(
      "https://knox.kiosk.ke/?edit=1",
    );
  });

  it("rejects foreign origins and non-shop paths", () => {
    expect(
      resolveStorefrontDesignReturnTo("https://evil.com/?edit=1", shopBase),
    ).toBeNull();
    expect(
      resolveStorefrontDesignReturnTo("/business/design", shopBase),
    ).toBeNull();
    expect(resolveStorefrontDesignReturnTo(null, shopBase)).toBeNull();
  });
});
