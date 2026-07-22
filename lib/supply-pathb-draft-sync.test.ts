import { describe, expect, it } from "bun:test";

import {
  buildSupplyClientDraftJson,
  composeSupplySessionNotes,
  parseSupplyClientDraftJson,
  parseSupplyNotesParts,
  pathBLineToSyncFields,
} from "@/lib/supply-pathb-draft-sync";

describe("supply-pathb-draft-sync", () => {
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
  });
});
