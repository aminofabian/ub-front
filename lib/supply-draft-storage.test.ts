import { describe, expect, it } from "bun:test";

import type { SupplierItemLinkRecord } from "@/lib/api";
import {
  mergeCashierLinesOntoLinks,
  mergeNewSupplyRowsOntoLinks,
  newSupplyDraftHasProgress,
  type CashierSupplyLinePersisted,
  type SupplyDraftRowPersisted,
} from "@/lib/supply-draft-storage";

function link(
  partial: Partial<SupplierItemLinkRecord> &
    Pick<SupplierItemLinkRecord, "id" | "itemId" | "itemName" | "sku">,
): SupplierItemLinkRecord {
  return {
    primary: false,
    active: true,
    ...partial,
  };
}

describe("supply-draft-storage", () => {
  it("detects meaningful new-supply progress", () => {
    expect(
      newSupplyDraftHasProgress({
        supplier: null,
        notes: "",
        docRef: "",
        rows: [],
        extras: [],
      }),
    ).toBe(false);

    expect(
      newSupplyDraftHasProgress({
        supplier: null,
        notes: "",
        docRef: "",
        rows: [
          {
            key: "1",
            source: "linked",
            item: null,
            qtyStr: "12",
            unitStr: "10",
            sellPriceStr: "",
            sellPriceTouched: false,
            expiry: "",
          },
        ],
        extras: [],
      }),
    ).toBe(true);
  });

  it("merges draft qty/cost onto refreshed supplier links", () => {
    const links = [
      link({
        id: "l1",
        itemId: "i1",
        itemName: "Milk",
        sku: "M1",
        currentStock: 5,
      }),
      link({
        id: "l2",
        itemId: "i2",
        itemName: "Bread",
        sku: "B1",
        currentStock: 0,
      }),
    ];
    const draft: SupplyDraftRowPersisted[] = [
      {
        key: "r1",
        source: "linked",
        link: link({
          id: "old",
          itemId: "i1",
          itemName: "Milk",
          sku: "M1",
          currentStock: 0,
        }),
        item: null,
        qtyStr: "60",
        unitStr: "52.00",
        sellPriceStr: "65.00",
        sellPriceTouched: true,
        expiry: "2026-08-01",
      },
    ];

    const merged = mergeNewSupplyRowsOntoLinks(
      links,
      draft,
      (l) => ({
        key: `new-${l.itemId}`,
        source: "linked",
        link: l,
        item: null,
        qtyStr: "",
        unitStr: "",
        sellPriceStr: "",
        sellPriceTouched: false,
        expiry: "",
      }),
      (row) =>
        row.source === "linked" && row.link
          ? row.link.itemId
          : (row.item?.id ?? null),
    );

    expect(merged).toHaveLength(2);
    expect(merged[0]?.qtyStr).toBe("60");
    expect(merged[0]?.unitStr).toBe("52.00");
    expect(merged[0]?.link?.currentStock).toBe(5);
    expect(merged[1]?.qtyStr).toBe("");
    expect(merged[1]?.key).toBe("new-i2");
  });

  it("merges cashier line edits onto refreshed links", () => {
    const links = [
      link({ id: "l1", itemId: "i1", itemName: "Milk", sku: "M1" }),
    ];
    const draft: CashierSupplyLinePersisted[] = [
      {
        itemId: "i1",
        name: "Milk",
        sku: "M1",
        stock: null,
        qtyStr: "10",
        costStr: "40",
        sellStr: "50",
        seedCost: "35",
        seedSell: "45",
      },
    ];
    const merged = mergeCashierLinesOntoLinks(links, draft, (l) => ({
      itemId: l.itemId,
      name: l.itemName,
      sku: l.sku,
      stock: null,
      qtyStr: "",
      costStr: "35.00",
      sellStr: "45.00",
      seedCost: "35.00",
      seedSell: "45.00",
    }));
    expect(merged[0]?.qtyStr).toBe("10");
    expect(merged[0]?.costStr).toBe("40");
    expect(merged[0]?.seedCost).toBe("35.00");
  });
});
