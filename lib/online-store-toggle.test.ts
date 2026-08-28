import { describe, expect, it } from "bun:test";

import type { BusinessRecord } from "@/lib/api";

import {
  buildOnlineStorePatch,
  firstCatalogBranchId,
  withStorefrontEnabled,
} from "./online-store-toggle";

describe("firstCatalogBranchId", () => {
  it("keeps the current branch when set", () => {
    expect(
      firstCatalogBranchId(
        [
          { id: "a", active: true },
          { id: "b", active: true },
        ],
        "b",
      ),
    ).toBe("b");
  });

  it("picks the first active branch when none is current", () => {
    expect(
      firstCatalogBranchId([
        { id: "inactive", active: false },
        { id: "live", active: true },
      ]),
    ).toBe("live");
  });

  it("returns empty when there are no branches", () => {
    expect(firstCatalogBranchId([])).toBe("");
  });
});

describe("buildOnlineStorePatch", () => {
  it("turns the store off without a branch", () => {
    expect(buildOnlineStorePatch({ enabled: false, catalogBranchId: "" })).toEqual({
      ok: true,
      payload: { enabled: false },
    });
  });

  it("requires a catalog branch to turn the store on", () => {
    expect(buildOnlineStorePatch({ enabled: true, catalogBranchId: "" })).toEqual({
      ok: false,
      reason: "no-branch",
    });
  });

  it("includes the catalog branch when turning on", () => {
    expect(
      buildOnlineStorePatch({ enabled: true, catalogBranchId: " br-1 " }),
    ).toEqual({
      ok: true,
      payload: { enabled: true, catalogBranchId: "br-1" },
    });
  });
});

describe("withStorefrontEnabled", () => {
  it("sets enabled and keeps existing storefront fields", () => {
    const business = {
      name: "Palmart",
      storefront: {
        enabled: false,
        featuredItemIds: ["sku-1"],
        storeThemeId: "mart",
        catalogBranchId: "br-1",
      },
    } as BusinessRecord;

    expect(withStorefrontEnabled(business, true, "br-1").storefront).toEqual({
      enabled: true,
      featuredItemIds: ["sku-1"],
      catalogBranchId: "br-1",
      label: undefined,
      announcement: undefined,
      deliveryAreas: undefined,
      storeThemeId: "mart",
      landingTemplateId: undefined,
      landingContent: undefined,
      whatsappCheckout: undefined,
      designJson: undefined,
    });
  });
});
