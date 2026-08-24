import { describe, expect, it } from "bun:test";

import {
  canStorefrontOnPageEdit,
  storefrontStaffEditReturnPath,
  storefrontWantsEditFromSearch,
  resolveStorefrontDesignReturnTo,
  trackStorefrontEditEvent,
  STOREFRONT_DRAFT_PREVIEW_MAX_CHARS,
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

describe("canStorefrontOnPageEdit", () => {
  it("allows owner and admin by role", () => {
    expect(canStorefrontOnPageEdit({ roleKey: "owner" })).toBe(true);
    expect(canStorefrontOnPageEdit({ roleKey: "admin" })).toBe(true);
  });

  it("allows manager with business.manage_settings", () => {
    expect(
      canStorefrontOnPageEdit({
        roleKey: "manager",
        permissions: ["business.manage_settings"],
      }),
    ).toBe(true);
  });

  it("rejects cashier / manager without settings permission", () => {
    expect(canStorefrontOnPageEdit({ roleKey: "cashier" })).toBe(false);
    expect(
      canStorefrontOnPageEdit({
        roleKey: "manager",
        permissions: ["catalog.items.read"],
      }),
    ).toBe(false);
  });

  it("normalizes role key case and whitespace", () => {
    expect(canStorefrontOnPageEdit({ roleKey: "Owner" })).toBe(true);
    expect(canStorefrontOnPageEdit({ roleKey: " ADMIN " })).toBe(true);
    expect(
      canStorefrontOnPageEdit({
        roleKey: " MANAGER ",
        permissions: ["business.manage_settings"],
      }),
    ).toBe(true);
    expect(canStorefrontOnPageEdit({ roleKey: " Cashier " })).toBe(false);
  });
});

describe("STOREFRONT_DRAFT_PREVIEW_MAX_CHARS", () => {
  it("matches Design studio URL ceiling", () => {
    expect(STOREFRONT_DRAFT_PREVIEW_MAX_CHARS).toBe(8000);
  });
});

describe("trackStorefrontEditEvent", () => {
  it("pushes to dataLayer and dispatches CustomEvent", () => {
    if (typeof window === "undefined") return;
    const w = window as Window & { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = [];
    let seen: CustomEvent | null = null;
    const handler = (e: Event) => {
      seen = e as CustomEvent;
    };
    window.addEventListener("kiosk:storefront-event", handler);
    trackStorefrontEditEvent("storefront_edit_mode_on", { source: "test" });
    window.removeEventListener("kiosk:storefront-event", handler);
    expect(seen?.detail).toMatchObject({
      event: "storefront_edit_mode_on",
      source: "test",
    });
    expect(w.dataLayer?.at(-1)).toMatchObject({
      event: "storefront_edit_mode_on",
      source: "test",
    });
  });
});
