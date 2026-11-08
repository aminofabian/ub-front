import { describe, expect, test } from "bun:test";

import type {
  MarketplaceAttachNote,
  MarketplaceAttachResult,
} from "@/lib/marketplace-api";

import {
  addableProducts,
  attachCta,
  describeAttachResult,
  filterAttachProducts,
  groupAttachNotes,
  hasAttachReport,
  newProductIds,
  noteLabel,
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

function note(
  extra: Partial<MarketplaceAttachNote> = {},
): MarketplaceAttachNote {
  return {
    name: "Unga Jogoo 2kg",
    barcode: "6001001",
    outcome: "existing_linked",
    reason: 'Already in your shop as "Unga Jogoo 2kg" (same barcode)',
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

describe("newProductIds", () => {
  test("is what adding would create: not in the shop and not yet linked", () => {
    const shelf = [
      product("1", "New", { inShop: false }),
      product("2", "Stocked", { inShop: true }),
      product("3", "Linked", { inShop: false, alreadyLinked: true }),
      product("4", "Unknown"),
      product("5", "Also new", { inShop: false, alreadyLinked: false }),
    ];
    expect(newProductIds(shelf)).toEqual(["1", "5"]);
  });

  test("is empty when the shop's stock is not known", () => {
    expect(newProductIds([product("1", "A"), product("2", "B")])).toEqual([]);
  });
});

describe("describeAttachResult", () => {
  test("tells new items apart from existing ones that were only linked", () => {
    const summary = describeAttachResult(
      result({ createdItems: 1, linkedExisting: 2 }),
      null,
    );
    expect(summary).toEqual({
      title: "Mama Njeri Wholesalers added",
      description: "1 new item created and linked · 2 existing items linked",
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
    expect(summary.description).toBe("2 not added");
    expect(summary.tone).toBe("warning");
  });

  test("warns when the whole shelf was skipped", () => {
    expect(describeAttachResult(result({ skipped: 4 }), null).tone).toBe(
      "warning",
    );
  });

  test("some landing is still a success even if others were not added", () => {
    const summary = describeAttachResult(
      result({ linkedExisting: 1, skipped: 1 }),
      2,
    );
    expect(summary.description).toBe("1 existing item linked · 1 not added");
    expect(summary.tone).toBe("success");
  });

  test("reports products that were already linked", () => {
    const summary = describeAttachResult(result({ alreadyLinked: 3 }), 3);
    expect(summary.description).toBe("3 already linked");
    expect(summary.tone).toBe("success");
  });

  test("keeps the already-linked count next to new links", () => {
    const summary = describeAttachResult(
      result({ createdItems: 1, alreadyLinked: 1 }),
      null,
    );
    expect(summary.description).toBe("1 new item created and linked · 1 already linked");
  });

  test("lists every part in a fixed order", () => {
    const summary = describeAttachResult(
      result({ createdItems: 3, linkedExisting: 1, alreadyLinked: 2, skipped: 1 }),
      null,
    );
    expect(summary.description).toBe(
      "3 new items created and linked · 1 existing item linked · 2 already linked · 1 not added",
    );
  });

  test("a supplier the shop already had is updated, not added", () => {
    const summary = describeAttachResult(result({ linkedExisting: 1 }), 1, {
      topUp: true,
    });
    expect(summary.title).toBe("Mama Njeri Wholesalers updated");
    expect(
      describeAttachResult(result({ linkedExisting: 1 }), 1, { topUp: false })
        .title,
    ).toBe("Mama Njeri Wholesalers added");
  });
});

describe("groupAttachNotes", () => {
  test("sorts notes into the report's sections and keeps their order", () => {
    const groups = groupAttachNotes(
      result({
        notes: [
          note({ name: "A" }),
          note({ name: "B", outcome: "skipped", reason: "No default item type in your shop" }),
          note({ name: "C", outcome: "already_linked", reason: "Already linked to this supplier" }),
          note({ name: "D" }),
        ],
      }),
    );
    expect(groups.existing.map((n) => n.name)).toEqual(["A", "D"]);
    expect(groups.alreadyLinked.map((n) => n.name)).toEqual(["C"]);
    expect(groups.skipped.map((n) => n.name)).toEqual(["B"]);
  });

  test("a response without notes has empty sections", () => {
    expect(groupAttachNotes(result())).toEqual({
      existing: [],
      alreadyLinked: [],
      skipped: [],
    });
  });
});

describe("hasAttachReport", () => {
  test("is false when every product simply became a new item", () => {
    expect(hasAttachReport(result({ createdItems: 5 }))).toBe(false);
    expect(hasAttachReport(result({ notes: [], notesOmitted: 0 }))).toBe(false);
  });

  test("is true when any product has something to say", () => {
    expect(hasAttachReport(result({ notes: [note()] }))).toBe(true);
  });

  test("is true when notes were cut off, even if none are listed", () => {
    expect(hasAttachReport(result({ notes: [], notesOmitted: 12 }))).toBe(true);
  });
});

describe("noteLabel", () => {
  test("prefers the product's name", () => {
    expect(noteLabel(note({ name: "  Sugar 1kg  " }))).toBe("Sugar 1kg");
  });

  test("falls back to the barcode, then to a plain word", () => {
    expect(noteLabel(note({ name: null, barcode: "6001001" }))).toBe("6001001");
    expect(noteLabel(note({ name: "   ", barcode: " 6001001 " }))).toBe("6001001");
    expect(noteLabel(note({ name: null, barcode: null }))).toBe("A product");
  });
});
