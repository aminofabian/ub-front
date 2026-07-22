import { describe, expect, test } from "bun:test";

import { isGlobalCatalogShellEmpty } from "./global-catalog-empty";
import { branchLocalityPlaceholder } from "./onboarding-questionnaire";

describe("isGlobalCatalogShellEmpty", () => {
  const emptyMeta = {
    catalogId: "c1",
    catalogCode: "ug-retail",
    catalogName: "Uganda Retail",
    currency: "UGX",
    categories: [],
    packs: [],
  };

  test("detects empty regional shell", () => {
    expect(
      isGlobalCatalogShellEmpty({
        meta: emptyMeta,
        productCount: 0,
        totalElements: 0,
        search: "",
        categoryId: null,
        packId: null,
      }),
    ).toBe(true);
  });

  test("ignores search/filter empties", () => {
    expect(
      isGlobalCatalogShellEmpty({
        meta: emptyMeta,
        productCount: 0,
        totalElements: 0,
        search: "milk",
        categoryId: null,
        packId: null,
      }),
    ).toBe(false);
  });

  test("requires meta packs and categories empty", () => {
    expect(
      isGlobalCatalogShellEmpty({
        meta: {
          ...emptyMeta,
          packs: [
            {
              id: "p1",
              code: "x",
              name: "Pack",
              productCount: 0,
              sortOrder: 0,
            },
          ],
        },
        productCount: 0,
        totalElements: 0,
        search: "",
        categoryId: null,
        packId: null,
      }),
    ).toBe(false);
  });
});

describe("branchLocalityPlaceholder", () => {
  test("uses Uganda examples for UG", () => {
    expect(branchLocalityPlaceholder(0, "UG")).toBe("Kampala");
  });

  test("falls back to Kenya examples", () => {
    expect(branchLocalityPlaceholder(0, "XX")).toBe("Mirema");
  });
});
