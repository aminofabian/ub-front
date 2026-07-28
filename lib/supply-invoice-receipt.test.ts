import { describe, expect, it } from "bun:test";

import {
  buildSupplyInvoiceEscPos,
  buildSupplyInvoiceReceiptSnapshot,
  buildSupplyPaymentTerms,
} from "@/lib/supply-invoice-receipt";

describe("buildSupplyPaymentTerms", () => {
  it("includes phone when provided", () => {
    const terms = buildSupplyPaymentTerms("0712 345 678");
    expect(terms.paymentTerms).toMatch(/48 hours/i);
    expect(terms.contactNote).toContain("0712 345 678");
  });

  it("falls back when phone missing", () => {
    const terms = buildSupplyPaymentTerms(null);
    expect(terms.contactNote).toMatch(/branch/i);
  });
});

describe("buildSupplyInvoiceReceiptSnapshot", () => {
  it("totals lines and stamps settlement copy", () => {
    const snap = buildSupplyInvoiceReceiptSnapshot({
      businessName: "Palmart",
      branchName: "Westlands",
      branchPhone: "0700111222",
      sessionId: "abc-def-ghi",
      supplierName: "Jamro",
      currency: "kes",
      lines: [
        {
          description: "Beef",
          quantity: 2,
          unitCost: 500,
          lineTotal: 1000,
        },
        {
          description: "Chicken",
          quantity: 1,
          unitCost: 350.5,
          lineTotal: 350.5,
        },
      ],
    });
    expect(snap.grandTotal).toBe(1350.5);
    expect(snap.currency).toBe("KES");
    expect(snap.extras).toEqual([]);
    expect(snap.paymentTerms).toMatch(/48 hours/i);
    expect(snap.contactNote).toContain("0700111222");
  });

  it("adds extra costs into grand total", () => {
    const snap = buildSupplyInvoiceReceiptSnapshot({
      businessName: "Palmart",
      branchName: "Westlands",
      sessionId: "sess-2",
      supplierName: "Jamro",
      currency: "KES",
      lines: [
        {
          description: "Rice",
          quantity: 10,
          unitCost: 100,
          lineTotal: 1000,
        },
      ],
      extras: [
        { category: "transport", amount: 200, description: "Delivery" },
        { category: "interest", amount: 50 },
      ],
    });
    expect(snap.grandTotal).toBe(1250);
    expect(snap.extras).toHaveLength(2);
  });
});

describe("buildSupplyInvoiceEscPos", () => {
  it("emits INIT, invoice label, payment terms, and cut tail", () => {
    const snap = buildSupplyInvoiceReceiptSnapshot({
      businessName: "Palmart",
      branchName: "CBD",
      branchPhone: "0700",
      sessionId: "session-1",
      supplierName: "Acme Supplies",
      currency: "KES",
      lines: [
        {
          description: "Sugar 2kg",
          quantity: 3,
          unitCost: 200,
          lineTotal: 600,
          sku: "SUG-2",
        },
      ],
    });
    const bytes = buildSupplyInvoiceEscPos(snap, 80);
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
    const text = new TextDecoder("ascii", { fatal: false }).decode(bytes);
    expect(text).toContain("SUPPLY INVOICE");
    expect(text).toContain("Acme Supplies");
    expect(text).toContain("PAY WITHIN 48 HOURS");
    expect(text).toContain("AMOUNT DUE");
    expect(text).toContain("Tel: 0700");
    // Partial cut: GS V 1
    expect(bytes[bytes.length - 3]).toBe(0x1d);
    expect(bytes[bytes.length - 2]).toBe(0x56);
    expect(bytes[bytes.length - 1]).toBe(0x01);
  });
});
