import { describe, expect, it } from "vitest";

import {
  cashiersFromTicks,
  filterTicksByCashiers,
  ticksFromTransactions,
} from "@/lib/business-hub/ticks-from-transactions";
import type { SaleTransaction } from "@/lib/sale-transactions";

function tx(
  partial: Partial<SaleTransaction> & Pick<SaleTransaction, "saleId">,
): SaleTransaction {
  return {
    receiptNo: null,
    soldAt: "2026-07-26T10:00:00Z",
    cashierName: "Amina",
    customerName: "",
    paymentMethod: "cash",
    paymentMethods: null,
    channel: "walk_in",
    status: "completed",
    lineCount: 1,
    total: 100,
    profit: 20,
    mpesaVerified: false,
    lines: [
      {
        saleId: partial.saleId,
        soldAt: "2026-07-26T10:00:00Z",
        cashierName: partial.cashierName ?? "Amina",
        customerName: "",
        paymentMethod: "cash",
        itemId: "i1",
        itemName: "Milk 1L",
        quantity: 1,
        unitPrice: 100,
        lineTotal: 100,
        profit: 20,
        status: "completed",
      },
    ],
    ...partial,
  };
}

describe("ticksFromTransactions", () => {
  it("keeps a pool of recent sales with cashier", () => {
    const rows = [
      tx({ saleId: "a", cashierName: "Amina" }),
      tx({ saleId: "b", cashierName: "Brian" }),
      tx({ saleId: "c", cashierName: "Amina" }),
      tx({ saleId: "d", cashierName: "Cate" }),
    ];
    const ticks = ticksFromTransactions(rows, 3);
    expect(ticks.map((t) => t.saleId)).toEqual(["a", "b", "c"]);
    expect(ticks[0]?.cashierName).toBe("Amina");
  });

  it("lists cashiers and filters by selection", () => {
    const ticks = ticksFromTransactions(
      [
        tx({ saleId: "a", cashierName: "Amina" }),
        tx({ saleId: "b", cashierName: "Brian" }),
        tx({ saleId: "c", cashierName: "Amina" }),
        tx({ saleId: "d", cashierName: "Brian" }),
      ],
      10,
    );
    expect(cashiersFromTicks(ticks)).toEqual(["Amina", "Brian"]);
    expect(
      filterTicksByCashiers(ticks, ["Brian"]).map((t) => t.saleId),
    ).toEqual(["b", "d"]);
    expect(filterTicksByCashiers(ticks, []).map((t) => t.saleId)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("collapses casing variants into one cashier tab", () => {
    const ticks = ticksFromTransactions(
      [
        tx({ saleId: "a", cashierName: "moreen" }),
        tx({ saleId: "b", cashierName: "Agnes" }),
        tx({ saleId: "c", cashierName: "Moreen" }),
      ],
      10,
    );
    expect(ticks.map((t) => t.cashierName)).toEqual([
      "Moreen",
      "Agnes",
      "Moreen",
    ]);
    expect(cashiersFromTicks(ticks)).toEqual(["Moreen", "Agnes"]);
    expect(
      filterTicksByCashiers(ticks, ["moreen"]).map((t) => t.saleId),
    ).toEqual(["a", "c"]);
  });
});
