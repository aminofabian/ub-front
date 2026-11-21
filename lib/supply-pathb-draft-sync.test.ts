import { describe, expect, it } from "bun:test";

import {
  buildSupplyClientDraftJson,
  composeSupplySessionNotes,
  parseSupplyClientDraftJson,
  parseSupplyNotesParts,
  pathBLineToSyncFields,
  pathBSessionMatchesSupplyContext,
} from "@/lib/supply-pathb-draft-sync";

describe("supply-pathb-draft-sync", () => {
  it("rejects Path B session reuse across suppliers or branches", () => {
    const base = {
      status: "draft",
      supplierId: "sup-oreste",
      branchId: "br-1",
    };
    expect(
      pathBSessionMatchesSupplyContext(base, {
        supplierId: "sup-oreste",
        branchId: "br-1",
      }),
    ).toBe(true);
    expect(
      pathBSessionMatchesSupplyContext(base, {
        supplierId: "sup-robinson",
        branchId: "br-1",
      }),
    ).toBe(false);
    expect(
      pathBSessionMatchesSupplyContext(base, {
        supplierId: "sup-oreste",
        branchId: "br-2",
      }),
    ).toBe(false);
    expect(
      pathBSessionMatchesSupplyContext(
        { ...base, status: "posted" },
        { supplierId: "sup-oreste", branchId: "br-1" },
      ),
    ).toBe(false);
  });

  it("round-trips client draft json", () => {
    const raw = buildSupplyClientDraftJson({
      docRef: "INV-1",
      showExpiry: true,
      extras: [{ key: "a", category: "transport", amount: "100", desc: "" }],
    });
    const parsed = parseSupplyClientDraftJson(raw);
    expect(parsed?.docRef).toBe("INV-1");
    expect(parsed?.showExpiry).toBe(true);
    expect(parsed?.extras).toHaveLength(1);
  });

  it("parses supplier document ref from session notes", () => {
    expect(
      parseSupplyNotesParts("Supplier document ref: ABC\nDoor delivery"),
    ).toEqual({
      docRef: "ABC",
      notes: "Door delivery",
    });
    expect(composeSupplySessionNotes("ABC", "Door delivery")).toBe(
      "Supplier document ref: ABC\nDoor delivery",
    );
  });

  it("hydrates draft qty/cost/sell/expiry from Path B line", () => {
    const fields = pathBLineToSyncFields({
      id: "l1",
      sortOrder: 0,
      descriptionText: "Milk (M1)",
      amountMoney: 3120,
      suggestedItemId: "i1",
      lineStatus: "pending",
      draftQty: 60,
      draftUnitCost: 52,
      draftSellPrice: 65,
      draftExpiryDate: "2026-08-01",
    });
    expect(fields.qtyStr).toBe("60");
    expect(fields.unitStr).toBe("52.00");
    expect(fields.sellPriceStr).toBe("65.00");
    expect(fields.sellPriceTouched).toBe(true);
    expect(fields.expiry).toBe("2026-08-01");
    expect(fields.packUnit).toBeNull();
    expect(fields.unitsPerPurchaseUnit).toBeNull();
  });

  it("hydrates a packaged line with its pack view and snapshot", () => {
    const fields = pathBLineToSyncFields({
      id: "l2",
      sortOrder: 0,
      descriptionText: "Biscuits (carton of 12 packets)",
      amountMoney: 2400,
      suggestedItemId: "i1",
      lineStatus: "pending",
      draftQty: 120,
      draftUnitCost: 20,
      purchaseUnit: "carton",
      purchaseQty: 2,
      unitsPerPurchaseUnit: 120,
      packPrice: 1200,
      packOptionId: "pack-1",
    });
    expect(fields.packUnit).toBe("carton");
    expect(fields.purchaseQty).toBe(2);
    expect(fields.unitsPerPurchaseUnit).toBe(120);
    expect(fields.packPrice).toBe(1200);
    expect(fields.packOptionId).toBe("pack-1");
  });
});
