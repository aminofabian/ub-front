import { describe, expect, it } from "vitest";

import { ticksFromTransactions } from "@/lib/business-hub/ticks-from-transactions";
import type { SaleTransaction } from "@/lib/sale-transactions";

function tx(
  partial: Partial<SaleTransaction> & Pick<SaleTransaction, "saleId">,
): SaleTransaction {
  return {
    receiptNo: null,
    soldAt: "2026-07-26T10:00:00Z",
    cashierName: "A",
    customerName: "",
    paymentMethod: "cash",
    paymentMethods: null,
    channel: "walk_in",
    status: "completed",
    lineCount: 1,
    total: 100,
    profit: 20,
    lines: [
      {
        saleId: partial.saleId,
        soldAt: "2026-07-26T10:00:00Z",
        cashierName: "A",
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
  it("keeps only the newest three sales", () => {
    const rows = [
      tx({ saleId: "a", total: 10 }),
      tx({ saleId: "b", total: 20 }),
      tx({ saleId: "c", total: 30 }),
      tx({ saleId: "d", total: 40 }),
    ];
    expect(ticksFromTransactions(rows).map((t) => t.saleId)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("lists every line item with price", () => {
    const multi = tx({
      saleId: "m",
      lineCount: 2,
      total: 180,
      lines: [
        {
          saleId: "m",
          soldAt: "2026-07-26T10:00:00Z",
          cashierName: "A",
          customerName: "",
          paymentMethod: "cash",
          itemId: "i1",
          itemName: "Bread",
          quantity: 2,
          unitPrice: 50,
          lineTotal: 100,
          profit: 20,
          status: "completed",
        },
        {
          saleId: "m",
          soldAt: "2026-07-26T10:00:00Z",
          cashierName: "A",
          customerName: "",
          paymentMethod: "cash",
          itemId: "i2",
          itemName: "Milk 1L",
          quantity: 1,
          unitPrice: 80,
          lineTotal: 80,
          profit: 15,
          status: "completed",
        },
      ],
    });
    expect(ticksFromTransactions([multi])[0]?.items).toEqual([
      { name: "Bread", quantity: 2, lineTotal: 100 },
      { name: "Milk 1L", quantity: 1, lineTotal: 80 },
    ]);
  });

  it("labels cash and mpesa payments", () => {
    const cash = tx({ saleId: "c1", paymentMethod: "cash" });
    const mpesa = tx({
      saleId: "m1",
      paymentMethod: "mpesa_manual",
    });
    const split = tx({
      saleId: "s1",
      paymentMethod: "split",
      paymentMethods: "cash,mpesa_manual",
    });
    expect(ticksFromTransactions([cash])[0]?.paymentLabel).toBe("Cash");
    expect(ticksFromTransactions([mpesa])[0]?.paymentLabel).toBe("M-Pesa");
    expect(ticksFromTransactions([split])[0]?.paymentLabel).toBe(
      "Split · Cash + M-Pesa",
    );
  });
});
