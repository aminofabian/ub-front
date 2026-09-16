import { describe, expect, test } from "bun:test";

import type { ItemSummaryRecord, SupplierItemLinkRecord } from "@/lib/api";

import {
  isPickableCatalogRow,
  selectVisibleItems,
  supplierLinkToPickItem,
  togglePickedItem,
  visibleSelectionState,
} from "./store-product-pick";

function item(id: string, extra: Partial<ItemSummaryRecord> = {}): ItemSummaryRecord {
  return { id, name: id, sku: id, ...extra };
}

describe("supplierLinkToPickItem", () => {
  test("maps a supplier catalog row onto a pickable product", () => {
    const link = {
      id: "link-1",
      itemId: "p1",
      itemName: "Eggs tray",
      sku: "SKU-1",
      barcode: "123",
      primary: true,
      active: true,
    } as SupplierItemLinkRecord;
    expect(supplierLinkToPickItem(link)).toMatchObject({
      id: "p1",
      name: "Eggs tray",
      sku: "SKU-1",
      barcode: "123",
    });
  });
});

describe("togglePickedItem", () => {
  test("ignores products already in the store room", () => {
    const next = togglePickedItem(new Map(), item("a"), new Set(["a"]));
    expect(next.size).toBe(0);
  });

  test("adds then removes", () => {
    const once = togglePickedItem(new Map(), item("a"), new Set());
    expect([...once.keys()]).toEqual(["a"]);
    const twice = togglePickedItem(once, item("a"), new Set());
    expect(twice.size).toBe(0);
  });
});

describe("selectVisibleItems", () => {
  test("selects only available visible rows and keeps earlier picks", () => {
    const picked = new Map([["kept", item("kept")]]);
    const next = selectVisibleItems(
      picked,
      [item("a"), item("b"), item("taken"), item("group", { groupLabelOnly: true })],
      new Set(["taken"]),
      true,
    );
    expect([...next.keys()].sort()).toEqual(["a", "b", "kept"]);
  });
});

describe("visibleSelectionState", () => {
  test("counts available vs checked", () => {
    const picked = new Map([["a", item("a")]]);
    expect(
      visibleSelectionState(
        [item("a"), item("b"), item("taken")],
        picked,
        new Set(["taken"]),
      ),
    ).toEqual({ available: 2, selected: 1 });
  });
});

describe("isPickableCatalogRow", () => {
  test("skips label-only groups", () => {
    expect(isPickableCatalogRow(item("g", { groupLabelOnly: true }))).toBe(false);
    expect(isPickableCatalogRow(item("a"))).toBe(true);
  });
});
