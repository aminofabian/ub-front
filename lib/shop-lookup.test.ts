import { describe, expect, it } from "bun:test";

import {
  businessNameToSlug,
  normalizeShopLookupQuery,
} from "@/lib/shop-lookup";

describe("businessNameToSlug", () => {
  it("slugifies a display name like the backend", () => {
    expect(businessNameToSlug("Mama Njeri Shop")).toBe("mama-njeri-shop");
  });

  it("strips punctuation and collapses hyphens", () => {
    expect(businessNameToSlug("  Bar & Grill!!  ")).toBe("bar-grill");
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
