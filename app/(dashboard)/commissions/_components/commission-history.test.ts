import { describe, expect, test } from "bun:test";

import type { StaffLedgerEntryRecord } from "@/lib/service-business-api";

import { describeLedgerEntry, newestFirst, periodStart } from "./commission-history";

const entry = (patch: Partial<StaffLedgerEntryRecord>): StaffLedgerEntryRecord =>
  ({
    id: "e",
    staffProfileId: "s",
    kind: "COMMISSION",
    bucket: "COMMISSION",
    amount: 100,
    baseAmount: null,
    rule: null,
    source: "SERVICE",
    saleId: null,
    reversesId: null,
    payoutMethod: null,
    reference: null,
    reason: null,
    occurredAt: "2026-11-14T09:00:00Z",
    ...patch,
  }) as StaffLedgerEntryRecord;

describe("a line of earnings history", () => {
  test("says how a commission was worked out", () => {
    expect(describeLedgerEntry(entry({ rule: "PERCENT 40 (staff)", baseAmount: 250 }))).toEqual({
      what: "Commission on a service",
      detail: "40% of Ksh 250, their plan",
    });
    expect(describeLedgerEntry(entry({ rule: "SET 50 (at the till) shared", baseAmount: 50.01 })).detail).toBe(
      "set at Ksh 50 when the service was done, shared work",
    );
    expect(describeLedgerEntry(entry({ rule: "FIXED 80 (service)" })).detail).toBe("Ksh 80 a service, the service's own rate");
    expect(describeLedgerEntry(entry({ rule: "NONE" })).detail).toBe("no commission set for them");
    expect(describeLedgerEntry(entry({ rule: "PERCENT 50 (staff) less 62 to helpers shared", baseAmount: 500 })).detail).toBe(
      "50% of Ksh 500, their plan, less Ksh 62 paid to helpers",
    );
    expect(describeLedgerEntry(entry({ rule: "PERCENT 5 (product)", source: "PRODUCT", baseAmount: 1000 }))).toEqual({
      what: "Commission on products",
      detail: "5% of Ksh 1,000, products sold",
    });
    expect(describeLedgerEntry(entry({ rule: "PERCENT 50.00 (staff) after 300 product cost", baseAmount: 1000 })).detail).toBe(
      "50% of Ksh 700, their plan, after Ksh 300 product cost",
    );
    expect(describeLedgerEntry(entry({ rule: null })).detail).toBeNull();
  });

  test("tips, payouts, deductions and reversals read plainly", () => {
    expect(describeLedgerEntry(entry({ kind: "TIP", bucket: "TIPS" }))).toEqual({ what: "Tip", detail: null });
    expect(describeLedgerEntry(entry({ kind: "PAYOUT", amount: -500, payoutMethod: "MPESA", reference: "QK1" }))).toEqual({
      what: "Paid out",
      detail: "M-Pesa, ref QK1",
    });
    expect(describeLedgerEntry(entry({ kind: "PAYOUT", amount: 500, reason: "Payout reversed" }))).toEqual({
      what: "Payout undone",
      detail: "Payout reversed",
    });
    expect(describeLedgerEntry(entry({ kind: "ADJUSTMENT", amount: -200, reason: "Broken clipper" }))).toEqual({
      what: "Deduction",
      detail: "Broken clipper",
    });
    expect(describeLedgerEntry(entry({ kind: "REVERSAL", bucket: "TIPS", amount: -40, reason: "Refund" }))).toEqual({
      what: "Tip taken back",
      detail: "Refund",
    });
  });

  test("history reads newest first without changing what it was given", () => {
    const given = [entry({ id: "a", occurredAt: "2026-11-12T09:00:00Z" }), entry({ id: "b", occurredAt: "2026-11-14T09:00:00Z" })];
    expect(newestFirst(given).map((e) => e.id)).toEqual(["b", "a"]);
    expect(given[0]!.id).toBe("a");
  });

  test("quick periods end today", () => {
    expect(periodStart("today", "2026-11-14")).toBe("2026-11-14");
    expect(periodStart("week", "2026-11-14")).toBe("2026-11-08");
    expect(periodStart("week", "2026-11-03")).toBe("2026-10-28");
    expect(periodStart("month", "2026-11-14")).toBe("2026-11-01");
  });
});
