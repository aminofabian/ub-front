import { describe, expect, it } from "vitest";

import { EMPTY_PARENT } from "../_types";
import {
  catalogCreateDraftHasWork,
  catalogCreateDraftSummary,
  clearCatalogProductCreateDraft,
  loadCatalogProductCreateDraft,
  saveCatalogProductCreateDraft,
  type CatalogCreateProductDraft,
} from "./catalog-product-create-draft";

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

function draft(
  patch: Partial<CatalogCreateProductDraft> = {},
): CatalogCreateProductDraft {
  return {
    v: 1,
    updatedAt: 1,
    businessId: "biz",
    parent: { ...EMPTY_PARENT, name: "Kabras Sugar" },
    options: [],
    imageDataUrl: null,
    ...patch,
  };
}

describe("catalog create draft", () => {
  it("treats a named family with options as unfinished work", () => {
    const saved = draft({
      parent: { ...EMPTY_PARENT, productStructure: "group", name: "Soda" },
      options: [
        {
          key: "a",
          label: "500ml",
          barcode: "6161100010012",
          buyingPrice: "40",
          unitPrice: "60",
          stock: "1",
          sharedProductId: null,
          imageDataUrl: null,
        },
      ],
    });
    expect(catalogCreateDraftHasWork(saved)).toBe(true);
    expect(catalogCreateDraftSummary(saved)).toBe("Soda · 1 option");
  });

  it("ignores blank option rows that only carry the default stock", () => {
    const saved = draft({
      parent: { ...EMPTY_PARENT },
      options: [
        {
          key: "a",
          label: "",
          barcode: "",
          buyingPrice: "",
          unitPrice: "",
          stock: "1",
          sharedProductId: null,
          imageDataUrl: null,
        },
      ],
    });
    expect(catalogCreateDraftHasWork(saved)).toBe(false);
  });

  it("round-trips a draft and drops it when cleared", () => {
    const store = memoryStore();
    const saved = draft({
      parent: { ...EMPTY_PARENT, name: "Milk", barcode: "6161100099994" },
    });
    saveCatalogProductCreateDraft(saved, store);
    const loaded = loadCatalogProductCreateDraft("biz", store);
    expect(loaded?.parent.name).toBe("Milk");
    expect(loaded?.parent.barcode).toBe("6161100099994");
    clearCatalogProductCreateDraft("biz", store);
    expect(loadCatalogProductCreateDraft("biz", store)).toBeNull();
  });

  it("does not store an empty form", () => {
    const store = memoryStore();
    saveCatalogProductCreateDraft(draft({ parent: { ...EMPTY_PARENT } }), store);
    expect(loadCatalogProductCreateDraft("biz", store)).toBeNull();
  });
});
