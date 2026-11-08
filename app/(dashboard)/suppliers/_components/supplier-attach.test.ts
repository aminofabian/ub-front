import { describe, expect, test } from "bun:test";

import type { MarketplaceAttachResult } from "@/lib/marketplace-api";

import {
  addableProducts,
  attachCta,
  describeAttachResult,
  filterAttachProducts,
  type AttachPickerProduct,
} from "./supplier-attach";

function product(
  id: string,
  name: string,
  extra: Partial<AttachPickerProduct> = {},
): AttachPickerProduct {
  return {
    id,
    name,
    barcode: null,
    sku: null,
    categoryName: null,
    packSize: null,
    packUnit: null,
    unitPrice: null,
    currency: null,
    ...extra,
  };
}

function result(
  extra: Partial<MarketplaceAttachResult> = {},
): MarketplaceAttachResult {
  return {
    connectionId: "c1",
    localSupplierId: "s1",
    marketplaceSupplierId: "m1",
    supplierNumber: "S-0042",
    supplierName: "Mama Njeri Wholesalers",
    linkedExisting: 0,
    createdItems: 0,
    alreadyLinked: 0,
    skipped: 0,
    status: "active",
    ...extra,
  };
}

describe("filterAttachProducts", () => {
  const shelf = [
    product("1", "Unga Jogoo 2kg", { barcode: "6001001", categoryName: "Flour" }),
    product("2", "Sugar Mumias 1kg", { sku: "SUG-1", categoryName: "Sugar" }),
    product("3", "Rice Pishori 5kg", { barcode: "6003003" }),
  ];

  test("an empty query keeps everything", () => {
    expect(filterAttachProducts(shelf, "")).toEqual(shelf);
    expect(filterAttachProducts(shelf, "   ")).toEqual(shelf);
  });

  test("matches name, barcode, SKU and category without regard to case", () => {
    expect(filterAttachProducts(shelf, "UNGA").map((p) => p.id)).toEqual(["1"]);
    expect(filterAttachProducts(shelf, "6003").map((p) => p.id)).toEqual(["3"]);
    expect(filterAttachProducts(shelf, "sug-1").map((p) => p.id)).toEqual(["2"]);
    expect(filterAttachProducts(shelf, "flour").map((p) => p.id)).toEqual(["1"]);
  });

  test("every word has to match", () => {
    expect(filterAttachProducts(shelf, "sugar 1kg").map((p) => p.id)).toEqual([
      "2",
    ]);
    expect(filterAttachProducts(shelf, "sugar 5kg")).toEqual([]);
  });

  test("nothing matches nothing", () => {
    expect(filterAttachProducts(shelf, "paraffin")).toEqual([]);
  });
});

describe("addableProducts", () => {
  test("leaves out what is already linked", () => {
    const shelf = [
      product("1", "A"),
      product("2", "B", { alreadyLinked: true }),
      product("3", "C", { alreadyLinked: false }),
    ];
    expect(addableProducts(shelf).map((p) => p.id)).toEqual(["1", "3"]);
  });
});

describe("attachCta", () => {
  const base = {
    mode: "all" as const,
    selectedCount: 0,
    addableCount: 0,
    alreadyConnected: false,
    busy: false,
  };

  test("adding everything names the count", () => {
    expect(attachCta({ ...base, addableCount: 12 })).toEqual({
      label: "Add supplier and 12 products",
      disabled: false,
    });
    expect(attachCta({ ...base, addableCount: 1 }).label).toBe(
      "Add supplier and 1 product",
    );
  });

  test("an empty shelf still lets the supplier be added", () => {
    expect(attachCta(base)).toEqual({ label: "Add supplier", disabled: false });
  });

  test("choosing nothing says the supplier goes in alone", () => {
    expect(attachCta({ ...base, mode: "choose" })).toEqual({
      label: "Add supplier only",
      disabled: false,
    });
  });

  test("choosing some names how many", () => {
    expect(
      attachCta({ ...base, mode: "choose", selectedCount: 3, addableCount: 12 }),
    ).toEqual({ label: "Add supplier and 3 products", disabled: false });
  });

  test("a supplier the shop already has only tops up", () => {
    const connected = { ...base, alreadyConnected: true };
    expect(attachCta({ ...connected, addableCount: 4 }).label).toBe(
      "Add 4 products",
    );
    expect(
      attachCta({ ...connected, mode: "choose", selectedCount: 1 }).label,
    ).toBe("Add 1 product");
  });

  test("nothing to top up is disabled, not a silent no-op", () => {
    const connected = { ...base, alreadyConnected: true };
    expect(attachCta(connected)).toEqual({
      label: "Nothing new to add",
      disabled: true,
    });
    expect(attachCta({ ...connected, mode: "choose" })).toEqual({
      label: "Choose products to add",
      disabled: true,
    });
  });

  test("busy wins over everything", () => {
    expect(attachCta({ ...base, addableCount: 5, busy: true })).toEqual({
      label: "Adding…",
      disabled: true,
    });
  });
});

describe("describeAttachResult", () => {
  test("counts linked products and new items", () => {
    const summary = describeAttachResult(
      result({ linkedExisting: 2, createdItems: 1 }),
      null,
    );
    expect(summary).toEqual({
      title: "Mama Njeri Wholesalers added",
      description: "3 products linked · 1 new item created",
      tone: "success",
    });
  });

  test("a supplier added on its own says so plainly", () => {
    const summary = describeAttachResult(result(), 0);
    expect(summary.description).toBe("No products linked");
    expect(summary.tone).toBe("success");
  });

  test("an empty shelf is not a warning", () => {
    expect(describeAttachResult(result(), null).tone).toBe("success");
  });

  test("warns when the chosen products could not be added", () => {
    const summary = describeAttachResult(result({ skipped: 2 }), 2);
    expect(summary.description).toBe("2 could not be added");
    expect(summary.tone).toBe("warning");
  });

  test("warns when the whole shelf was skipped", () => {
    expect(describeAttachResult(result({ skipped: 4 }), null).tone).toBe(
      "warning",
    );
  });

  test("some landing is still a success even if others were skipped", () => {
    const summary = describeAttachResult(
      result({ linkedExisting: 1, skipped: 1 }),
      2,
    );
    expect(summary.description).toBe("1 product linked · 1 could not be added");
    expect(summary.tone).toBe("success");
  });

  test("reports products that were already linked when nothing new landed", () => {
    const summary = describeAttachResult(result({ alreadyLinked: 3 }), 3);
    expect(summary.description).toBe("3 already linked");
    expect(summary.tone).toBe("success");
  });

  test("does not echo already-linked counts next to new links", () => {
    const summary = describeAttachResult(
      result({ linkedExisting: 1, alreadyLinked: 1 }),
      1,
    );
    expect(summary.description).toBe("1 product linked");
  });
});
