import { describe, expect, it } from "bun:test";

import {
  businessNameToSlug,
  normalizeShopLookupQuery,
  shopAddressAdvice,
  shopAddressToSubmit,
  shorterShopHandles,
  suggestShopHandle,
} from "@/lib/shop-lookup";

describe("businessNameToSlug", () => {
  it("slugifies a display name like the backend", () => {
    expect(businessNameToSlug("Mama Njeri Shop")).toBe("mama-njeri-shop");
  });

  it("strips punctuation and collapses hyphens", () => {
    expect(businessNameToSlug("  Bar & Grill!!  ")).toBe("bar-grill");
  });
});

describe("suggestShopHandle", () => {
  it("runs words together and does not insert a hyphen", () => {
    expect(suggestShopHandle("King Kong")).toBe("kingkong");
    expect(suggestShopHandle("Bar & Grill!!")).toBe("bargrill");
  });

  it("keeps a short trading name, including shop", () => {
    expect(suggestShopHandle("Mama Njeri Shop")).toBe("mamanjerishop");
  });

  it("drops glue and extra words when the full address is long", () => {
    expect(suggestShopHandle("King Kong Supermarket Limited")).toBe("kingkong");
    expect(suggestShopHandle("Sunrise Groceries and General Store")).toBe(
      "sunrisegroceries",
    );
  });
});

describe("shorterShopHandles", () => {
  it("offers each word of a two-word name", () => {
    expect(shorterShopHandles("King Kong", "kingkong")).toEqual(["king", "kong"]);
  });

  it("offers the name without a trailing shop word", () => {
    expect(shorterShopHandles("Mama Njeri Shop", "mamanjerishop")).toEqual([
      "mamanjeri",
      "mama",
      "njeri",
    ]);
  });

  it("does not suggest the address already shown", () => {
    expect(shorterShopHandles("Palmart", "palmart")).toEqual([]);
  });
});

describe("shopAddressAdvice", () => {
  it("mentions a hyphen only before the owner has an address", () => {
    expect(shopAddressAdvice("", "")).toContain("hyphen");
    expect(shopAddressAdvice("King Kong", "kingkong")).not.toContain("hyphen");
  });

  it("acknowledges a hyphen the owner typed", () => {
    expect(shopAddressAdvice("King Kong", "king-kong")).toContain("hyphen");
  });
});

describe("shopAddressToSubmit", () => {
  it("keeps a typed hyphen and otherwise uses the suggestion", () => {
    expect(shopAddressToSubmit("king-kong", "King Kong")).toBe("king-kong");
    expect(shopAddressToSubmit("", "King Kong")).toBe("kingkong");
  });
});

describe("normalizeShopLookupQuery", () => {
  it("extracts the subdomain from a pasted shop URL", () => {
    expect(normalizeShopLookupQuery("https://mama-njeri.kiosk.ke/login/staff")).toBe(
      "mama-njeri",
    );
  });

  it("keeps a plain business name for the API", () => {
    expect(normalizeShopLookupQuery("Mama Njeri Shop")).toBe("Mama Njeri Shop");
  });
});
