import { describe, expect, test } from "bun:test";

import { commissionMonth, payrollMonthRange } from "./payroll-commission";

const row = (over: Record<string, unknown>) => ({
  staffProfileId: "p1",
  displayName: "Lenah",
  current: true,
  servicesDone: 0,
  serviceRevenue: 0,
  opening: 0,
  commission: 0,
  tips: 0,
  reversals: 0,
  adjustments: 0,
  paid: 0,
  closing: 0,
  ...over,
});

describe("payrollMonthRange", () => {
  test("covers the whole month, leap years included", () => {
    expect(payrollMonthRange(2026, 11)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(payrollMonthRange(2026, 2)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(payrollMonthRange(2028, 2)).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(payrollMonthRange(2026, 12)).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });
});

describe("commissionMonth", () => {
  test("earned is commission and tips less what voids took back; owed is what is left unpaid", () => {
    const month = commissionMonth({
      rows: [
        row({
          servicesDone: 6,
          serviceRevenue: 1800,
          opening: 100,
          commission: 600,
          tips: 150,
          reversals: -75,
          paid: 400,
          closing: 375,
        }),
      ],
    });
    const lenah = month.people[0]!;
    expect(lenah.earned).toBe(675);
    expect(lenah.corrections).toBe(-75);
    expect(lenah.paidOut).toBe(400);
    expect(lenah.owed).toBe(375);
    expect(lenah.overpaid).toBe(0);
    expect(month.earned).toBe(675);
    expect(month.owed).toBe(375);
    // 400 handed over out of the 775 that was due (100 brought forward + 675 earned).
    expect(month.paidPercent).toBe(52);
  });

  test("someone paid more than they earned shows as overpaid, never as a negative debt", () => {
    const month = commissionMonth({ rows: [row({ commission: 300, paid: 500, closing: -200 })] });
    expect(month.people[0]!.owed).toBe(0);
    expect(month.people[0]!.overpaid).toBe(200);
    expect(month.owed).toBe(0);
    expect(month.paidPercent).toBe(100);
  });

  test("people with nothing in the month are left out; the rest are biggest earner first", () => {
    const month = commissionMonth({
      rows: [
        row({ staffProfileId: "idle", displayName: "Fabian" }),
        row({ staffProfileId: "a", displayName: "mike", commission: 300, closing: 300, servicesDone: 4 }),
        row({ staffProfileId: "b", displayName: "Lenah", commission: 600, closing: 600, servicesDone: 6 }),
        // Owed from last month and nothing new: still shown, because the shop still owes it.
        row({ staffProfileId: "c", displayName: "Peter", opening: 250, closing: 250 }),
      ],
    });
    expect(month.people.map((p) => p.displayName)).toEqual(["Lenah", "mike", "Peter"]);
    expect(month.broughtForward).toBe(250);
    expect(month.owed).toBe(1150);
  });

  test("no statement, or an empty month, is all zeros", () => {
    expect(commissionMonth(null)).toEqual({
      people: [],
      earned: 0,
      commission: 0,
      tips: 0,
      paidOut: 0,
      owed: 0,
      broughtForward: 0,
      paidPercent: 0,
    });
  });
});
