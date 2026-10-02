import { describe, expect, it } from "bun:test";

import { buildTillSlipEscPos } from "@/lib/till-slip";

function textOf(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe("till slip", () => {
  const slip = {
    reference: "PO-1042",
    supplierName: "Mirema Greens",
    businessName: "Palmart",
    branchName: "Mirema",
    currency: "KES",
    lines: [{ name: "Tomatoes", qty: 3, unitCost: 80, lineTotal: 240 }],
  };

  it("heads an order slip as a purchase order", () => {
    const text = textOf(buildTillSlipEscPos(slip, "order"));
    expect(text).toContain("PURCHASE ORDER");
    expect(text).toContain("PO-1042");
    expect(text).toContain("Tomatoes");
    expect(text).not.toContain("GOODS RECEIPT");
  });

  it("heads a receipt slip as goods received", () => {
    const text = textOf(buildTillSlipEscPos(slip, "receipt"));
    expect(text).toContain("GOODS RECEIPT");
    expect(text).toContain("Received into stock");
  });

  it("prints when the API sends costs as strings", () => {
    const text = textOf(
      buildTillSlipEscPos(
        {
          ...slip,
          lines: [
            {
              name: "Tomatoes",
              qty: "3" as unknown as number,
              unitCost: "80" as unknown as number,
              lineTotal: "240" as unknown as number,
            },
          ],
        },
        "order",
      ),
    );
    expect(text).toContain("3 x 80.00 = 240.00");
  });
});
