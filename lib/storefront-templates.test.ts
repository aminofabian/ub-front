import { describe, expect, test } from "bun:test";

import {
  DEFAULT_LANDING_TEMPLATE_ID,
  DEFAULT_STORE_THEME_ID,
  LANDING_TEMPLATE_META,
  STORE_THEME_META,
  recommendLandingTemplateId,
  recommendStoreThemeId,
  shortlistLandingTemplateIds,
  shortlistStoreThemeIds,
} from "@/lib/storefront-templates";

describe("theme recommendation", () => {
  test("butchery names beat generic mart keywords", () => {
    expect(
      recommendStoreThemeId({ name: "Kamau Butchery" }),
    ).toBe("butcher-board");
  });

  test("falls back to mart when nothing matches", () => {
    expect(recommendStoreThemeId({ name: "XYZ" })).toBe(DEFAULT_STORE_THEME_ID);
  });

  test("storeTypes labels count", () => {
    expect(
      recommendStoreThemeId({
        name: "Sunshine",
        profile: { storeTypes: ["cosmetics"] },
      }),
    ).toBe("beauty-edit");
  });

  test("catalogue category names beat a generic shop name", () => {
    expect(
      recommendStoreThemeId({
        name: "Kamau",
        catalog: ["Meat", "Beef chuck"],
      }),
    ).toBe("butcher-board");
  });

  test("perfume in the catalogue ranks scent story", () => {
    expect(
      recommendStoreThemeId({
        name: "House",
        catalog: ["Perfume"],
      }),
    ).toBe("scent-story");
  });

  test("landing scorer picks a butcher closed-sign", () => {
    expect(
      recommendLandingTemplateId({ name: "Kamau Butchery" }),
    ).toBe("butchery-cut");
  });
});

describe("theme shortlist", () => {
  test("returns three distinct store ids", () => {
    const ids = shortlistStoreThemeIds({ name: "Kamau Butchery" });
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe("butcher-board");
  });

  test("empty shop still shortlists three, starting at mart", () => {
    const ids = shortlistStoreThemeIds({ name: "" });
    expect(ids[0]).toBe(DEFAULT_STORE_THEME_ID);
    expect(new Set(ids).size).toBe(3);
  });

  test("every store theme declares a unique layout", () => {
    const layouts = STORE_THEME_META.map((m) => m.phone.layout);
    expect(new Set(layouts).size).toBe(STORE_THEME_META.length);
  });

  test("every landing template declares a unique layout", () => {
    const layouts = LANDING_TEMPLATE_META.map((m) => m.phone.layout);
    expect(new Set(layouts).size).toBe(LANDING_TEMPLATE_META.length);
  });

  test("landing shortlist is three distinct ids", () => {
    const ids = shortlistLandingTemplateIds({ name: "Kamau Butchery" });
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe("butchery-cut");
  });

  test("landing fallback starts at the default", () => {
    expect(shortlistLandingTemplateIds({ name: "XYZ" })[0]).toBe(
      DEFAULT_LANDING_TEMPLATE_ID,
    );
  });
});
