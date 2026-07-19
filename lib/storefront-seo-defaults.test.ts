import { describe, expect, it } from "bun:test";

import {
  applySeoPlaceholders,
  defaultStorefrontMetaTitle,
  localitiesFromBranches,
  resolveStorefrontMetaTitle,
} from "@/lib/storefront-seo-defaults";

describe("storefront-seo-defaults", () => {
  it("builds groceries title with primary branch area", () => {
    expect(
      defaultStorefrontMetaTitle("Palmart", {
        areas: ["Westlands", "Kasarani"],
        countryCode: "KE",
      }),
    ).toBe("Palmart | Groceries & Essentials in Westlands, Kenya");
  });

  it("falls back to country when area is missing", () => {
    expect(
      defaultStorefrontMetaTitle("Palmart", { areas: [], countryCode: "KE" }),
    ).toBe("Palmart | Groceries & Essentials in Kenya");
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
});
