import { describe, expect, test } from "bun:test";

import type { PathBSupplyListRowRecord } from "@/lib/api";

import {
  addDays,
  billsInWindow,
  buildSpendTrend,
  comparisonLabel,
  formatWindowRange,
  isoDate,
  periodWindow,
  previousWindow,
  rankSources,
  rankSuppliers,
  spendDelta,
  statusMix,
  summarizeSpend,
  supplyRowDate,
  type SpendWindow,
} from "./spend-periods";

const NOW = new Date(2026, 9, 19, 14, 30); // Monday 19 October 2026

function row(
  partial: Partial<PathBSupplyListRowRecord> = {},
): PathBSupplyListRowRecord {
  return {
    supplierInvoiceId: partial.supplierInvoiceId ?? crypto.randomUUID(),
    supplierId: partial.supplierId ?? "supplier-a",
    supplierName: partial.supplierName ?? "Alpha Traders",
    invoiceNumber: partial.invoiceNumber ?? "INV-001",
    createdAt: partial.createdAt ?? "2026-10-19T08:00:00Z",
    invoiceDate: partial.invoiceDate ?? "2026-10-19",
    lineCount: partial.lineCount ?? 1,
    grandTotal: partial.grandTotal ?? 100,
    amountPaid: partial.amountPaid ?? 0,
    balanceOpen: partial.balanceOpen ?? 100,
    paymentStatus: partial.paymentStatus ?? "UNPAID",
    source: partial.source ?? "path_a",
    ...partial,
  };
}

function rangeLabel(window: SpendWindow) {
  return `${isoDate(window.start)}..${isoDate(window.endExclusive)}`;
}

describe("periodWindow", () => {
  test("uses today only for the today period", () => {
    expect(rangeLabel(periodWindow("today", NOW))).toBe(
      "2026-10-19..2026-10-20",
    );
  });

  test("starts the week on Monday", () => {
    expect(rangeLabel(periodWindow("week", NOW))).toBe(
      "2026-10-19..2026-10-20",
    );
    expect(rangeLabel(periodWindow("week", new Date(2026, 9, 21)))).toBe(
      "2026-10-19..2026-10-22",
    );
  });

  test("runs month-to-date and year-to-date", () => {
    expect(rangeLabel(periodWindow("month", NOW))).toBe(
      "2026-10-01..2026-10-20",
    );
    expect(rangeLabel(periodWindow("year", NOW))).toBe(
      "2026-01-01..2026-10-20",
    );
  });
});

describe("previousWindow", () => {
  test("compares today with yesterday", () => {
    const current = periodWindow("today", NOW);
    expect(rangeLabel(previousWindow("today", current, NOW))).toBe(
      "2026-10-18..2026-10-19",
    );
  });

  test("compares the same elapsed days last week", () => {
    const current = periodWindow("week", NOW);
    expect(rangeLabel(previousWindow("week", current, NOW))).toBe(
      "2026-10-12..2026-10-13",
    );
  });

  test("compares month-to-date with the same days last month", () => {
    const current = periodWindow("month", NOW);
    expect(rangeLabel(previousWindow("month", current, NOW))).toBe(
      "2026-09-01..2026-09-20",
    );
  });

  test("clamps a short previous month to its last day", () => {
    const now = new Date(2023, 2, 31);
    const current = periodWindow("month", now);
    expect(rangeLabel(previousWindow("month", current, now))).toBe(
      "2023-02-01..2023-03-01",
    );
  });

  test("compares year-to-date with the same calendar days last year", () => {
    const current = periodWindow("year", NOW);
    expect(rangeLabel(previousWindow("year", current, NOW))).toBe(
      "2025-01-01..2025-10-20",
    );
  });

  test("clamps 29 February when comparing with a non-leap year", () => {
    const now = new Date(2024, 1, 29);
    const current = periodWindow("year", now);
    expect(rangeLabel(previousWindow("year", current, now))).toBe(
      "2023-01-01..2023-03-01",
    );
  });
});

describe("formatWindowRange", () => {
  test("makes a compact range for each period", () => {
    expect(formatWindowRange(periodWindow("today", NOW), "today")).toBe(
      "19 Oct",
    );
    expect(formatWindowRange(periodWindow("week", NOW), "week")).toBe(
      "19 Oct",
    );
    expect(formatWindowRange(periodWindow("month", NOW), "month")).toBe(
      "1–19 Oct",
    );
    expect(formatWindowRange(periodWindow("year", NOW), "year")).toBe(
      "1 Jan – 19 Oct",
    );
  });

  test("keeps both months when a week crosses one", () => {
    const now = new Date(2026, 9, 2); // Friday; week starts 28 September
    expect(formatWindowRange(periodWindow("week", now), "week")).toBe(
      "28 Sep – 2 Oct",
    );
  });
});

describe("labels", () => {
  test("names the comparison window in plain language", () => {
    expect(comparisonLabel("today")).toBe("yesterday");
    expect(comparisonLabel("week")).toBe("last week");
    expect(comparisonLabel("month")).toBe("last month");
    expect(comparisonLabel("year")).toBe("last year");
  });
});

describe("summarizeSpend", () => {
  test("totals bills inside the window only", () => {
    const window = periodWindow("month", NOW);
    const rows = [
      row({ grandTotal: 1000, amountPaid: 400, balanceOpen: 600 }),
      row({
        supplierInvoiceId: "b",
        supplierId: "supplier-b",
        supplierName: "Beta",
        grandTotal: 250,
        amountPaid: 250,
        balanceOpen: 0,
        paymentStatus: "PAID",
      }),
      row({
        supplierInvoiceId: "c",
        invoiceDate: "2026-09-30",
        createdAt: "2026-10-01T00:00:00Z",
        grandTotal: 9999,
      }),
    ];

    expect(summarizeSpend(rows, window)).toEqual({
      total: 1250,
      paid: 650,
      open: 600,
      count: 2,
      supplierCount: 2,
      unpaidCount: 0,
      partialCount: 1,
      paidCount: 1,
    });
  });

  test("falls back to created date when invoice date is absent", () => {
    const window = periodWindow("today", NOW);
    const rows = [
      row({
        invoiceDate: null,
        createdAt: "2026-10-19T06:30:00Z",
        grandTotal: 75,
      }),
    ];
    expect(supplyRowDate(rows[0]!)).toEqual(new Date(2026, 9, 19));
    expect(summarizeSpend(rows, window).total).toBe(75);
  });
});

describe("spendDelta", () => {
  test("reports growth, decline, and first-ever spend", () => {
    expect(spendDelta(120, 100)).toMatchObject({
      percent: 20,
      direction: "up",
      isNew: false,
    });
    expect(spendDelta(80, 100)).toMatchObject({
      percent: -20,
      direction: "down",
      isNew: false,
    });
    expect(spendDelta(40, 0)).toMatchObject({
      percent: null,
      direction: "up",
      isNew: true,
    });
    expect(spendDelta(0, 0)).toMatchObject({
      percent: null,
      direction: "flat",
      isNew: false,
    });
  });
});

describe("buildSpendTrend", () => {
  test("plots a single bar per day for the current month", () => {
    const window = periodWindow("month", NOW);
    const points = buildSpendTrend(
      [row({ invoiceDate: "2026-10-01", grandTotal: 300 }), row()],
      "month",
      window,
      NOW,
    );
    expect(points).toHaveLength(31);
    expect(points[0]).toMatchObject({ label: "1", value: 300 });
    expect(points[18]).toMatchObject({ label: "19", value: 100, current: true });
    expect(points[19]?.future).toBe(true);
  });

  test("plots twelve bars for the year", () => {
    const window = periodWindow("year", NOW);
    const points = buildSpendTrend(
      [row({ invoiceDate: "2026-03-04", grandTotal: 1200 })],
      "year",
      window,
      NOW,
    );
    expect(points).toHaveLength(12);
    expect(points[2]).toMatchObject({ label: "Mar", value: 1200 });
    expect(points[9]).toMatchObject({ label: "Oct", current: true });
    expect(points[10]?.future).toBe(true);
  });

  test("shows the last fourteen days when today is selected", () => {
    const points = buildSpendTrend(
      [row({ invoiceDate: "2026-10-06", grandTotal: 50 })],
      "today",
      periodWindow("today", NOW),
      NOW,
    );
    expect(points).toHaveLength(14);
    expect(points[0]).toMatchObject({
      key: "2026-10-06",
      label: "06",
      value: 50,
    });
    expect(points[13]).toMatchObject({ label: "Today", current: true });
  });
});

describe("rankSuppliers", () => {
  test("groups by supplier and sorts by spend", () => {
    const window = periodWindow("month", NOW);
    const ranked = rankSuppliers(
      [
        row({ grandTotal: 100 }),
        row({ supplierId: "supplier-b", supplierName: "Beta", grandTotal: 400 }),
        row({ grandTotal: 250 }),
      ],
      window,
    );
    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toMatchObject({
      id: "supplier-b",
      value: 400,
      count: 1,
    });
    expect(ranked[1]).toMatchObject({ id: "supplier-a", value: 350, count: 2 });
  });
});

describe("rankSources", () => {
  test("splits order receipts from walk-in supplies", () => {
    const window = periodWindow("month", NOW);
    const ranked = rankSources(
      [
        row({ source: "path_a", grandTotal: 100 }),
        row({ source: "path_b", grandTotal: 250 }),
      ],
      window,
    );
    expect(ranked).toEqual([
      { id: "path_a", label: "Against an order", value: 100, count: 1 },
      { id: "path_b", label: "Walk-in supply", value: 250, count: 1 },
    ]);
  });
});

describe("statusMix", () => {
  test("splits billed value by payment state", () => {
    const window = periodWindow("month", NOW);
    const mix = statusMix(
      [
        row({ grandTotal: 300, amountPaid: 300, balanceOpen: 0 }),
        row({ grandTotal: 500, amountPaid: 200, balanceOpen: 300 }),
        row({ grandTotal: 200, amountPaid: 0, balanceOpen: 200 }),
        row({ grandTotal: 999, invoiceDate: "2026-09-20" }),
      ],
      window,
    );
    expect(mix).toEqual({
      paid: 300,
      partial: 500,
      unpaid: 200,
      paidCount: 1,
      partialCount: 1,
      unpaidCount: 1,
      total: 1000,
    });
  });
});

describe("billsInWindow", () => {
  test("returns the period's bills newest first", () => {
    const window = periodWindow("month", NOW);
    const bills = billsInWindow(
      [
        row({ invoiceNumber: "A", invoiceDate: "2026-10-02" }),
        row({ invoiceNumber: "B", invoiceDate: "2026-10-19" }),
        row({ invoiceNumber: "C", invoiceDate: "2026-09-12" }),
      ],
      window,
    );
    expect(bills.map((bill) => bill.invoiceNumber)).toEqual(["B", "A"]);
  });
});

test("addDays crosses month boundaries", () => {
  expect(isoDate(addDays(new Date(2026, 9, 31), 1))).toBe("2026-11-01");
});
