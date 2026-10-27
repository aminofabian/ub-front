import { describe, expect, it } from "bun:test";

import {
  applySeoPlaceholders,
  defaultStorefrontMetaTitle,
  localitiesFromBranches,
  resolveStorefrontDeliveryHint,
  resolveStorefrontMetaTitle,
} from "@/lib/storefront-seo-defaults";

describe("storefront-seo-defaults", () => {
  it("builds a title from the shop name and primary branch area", () => {
    expect(
      defaultStorefrontMetaTitle("Palmart", {
        areas: ["Westlands", "Kasarani"],
        countryCode: "KE",
      }),
    ).toBe("Palmart in Westlands, Kenya");
  });

  it("falls back to the shop name when area is missing", () => {
    expect(
      defaultStorefrontMetaTitle("Palmart", { areas: [], countryCode: "KE" }),
    ).toBe("Palmart");
  });

  it("uses the first line of the tenant snippet instead of a grocery title", () => {
    expect(
      defaultStorefrontMetaTitle(
        "Vya. Kale",
        { areas: ["Langata"], countryCode: "KE" },
        "Curated fashion, beauty & accessories. Shop online and pay via M-Pesa — we deliver nationwide.",
      ),
    ).toBe(
      "Vya. Kale | Curated fashion, beauty & accessories in Langata, Kenya",
    );
  });

  it("prefers a tenant-written title over the snippet", () => {
    expect(
      resolveStorefrontMetaTitle(
        "Vya. Kale",
        "Vya. Kale | Fashion & Beauty",
        { areas: ["Langata"], countryCode: "KE" },
        "Curated fashion, beauty & accessories. Shop online.",
      ),
    ).toBe("Vya. Kale | Fashion & Beauty");
  });

  it("substitutes [Area] placeholders in custom titles", () => {
    expect(
      resolveStorefrontMetaTitle(
        "Palmart",
        "[Name] | Groceries & Essentials in [Area], [Country]",
        { areas: ["Mirema"], countryCode: "KE" },
      ),
    ).toBe("Palmart | Groceries & Essentials in Mirema, Kenya");
  });

  it("tidies missing area in placeholder templates", () => {
    expect(
      applySeoPlaceholders("Shop in [Area], [Country]", {
        displayName: "Palmart",
        area: null,
        country: "Kenya",
      }),
    ).toBe("Shop in Kenya");
  });

  it("derives localities from branch address and name", () => {
    expect(
      localitiesFromBranches([
        {
          name: "HQ branch",
          address: "Westlands, Nairobi",
          active: true,
        },
        { name: "Kasarani branch", active: true },
      ]),
    ).toEqual(["Westlands", "Kasarani"]);
  });

  it("resolves delivery hint from branch localities before fallbacks", () => {
    expect(
      resolveStorefrontDeliveryHint({
        branchLocalities: ["Mirema Drive", "Thika"],
        deliveryAreaNames: ["Kilimani"],
        catalogBranchName: "HQ branch",
      }),
    ).toBe("Mirema Drive & Thika");
  });

  it("prefers env delivery hint over localities", () => {
    expect(
      resolveStorefrontDeliveryHint({
        envHint: "Westlands",
        branchLocalities: ["Mirema Drive"],
      }),
    ).toBe("Westlands");
  });
});
