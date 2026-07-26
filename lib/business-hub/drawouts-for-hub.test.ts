import { describe, expect, it } from "vitest";

import type { DrawoutRecord } from "@/lib/api";
import {
  cashiersFromDrawouts,
  filterDrawoutsByCashiers,
  hubDrawoutsFromRecords,
  totalDrawoutAmount,
} from "@/lib/business-hub/drawouts-for-hub";

function record(
  partial: Partial<DrawoutRecord> & Pick<DrawoutRecord, "id">,
): DrawoutRecord & { shiftCashierName?: string } {
  return {
    shiftId: "s1",
    category: "PETTY_CASH",
    amount: 100,
    description: "Tea",
    recipientName: "Staff",
    recipientContact: null,
    reference: null,
    status: "APPROVED",
    approvalTier: 1,
    initiatedBy: "u1",
    initiatedByName: "moreen",
    approvedBy: null,
    approvedByName: null,
    rejectedBy: null,
    rejectionReason: null,
    voidedBy: null,
    voidReason: null,
    expiresAt: null,
    createdAt: "2026-07-26T10:00:00Z",
    ...partial,
  };
}

describe("hubDrawoutsFromRecords", () => {
  it("maps and sorts newest first", () => {
    const rows = hubDrawoutsFromRecords([
      record({
        id: "old",
        createdAt: "2026-07-26T09:00:00Z",
        initiatedByName: "moreen",
      }),
      record({
        id: "new",
        createdAt: "2026-07-26T11:00:00Z",
        initiatedByName: "brian",
        amount: 250,
        category: "CASUAL_LABOUR",
        shiftCashierName: "brian",
      }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["new", "old"]);
    expect(rows[0]?.categoryLabel).toBe("Casual labour");
    expect(rows[0]?.amount).toBe(250);
  });

  it("filters by cashier initiator or shift owner", () => {
    const rows = hubDrawoutsFromRecords([
      record({
        id: "a",
        initiatedByName: "moreen",
        shiftCashierName: "moreen",
      }),
      record({
        id: "b",
        initiatedByName: "brian",
        shiftCashierName: "brian",
      }),
      record({
        id: "c",
        initiatedByName: "admin",
        shiftCashierName: "moreen",
      }),
    ]);
    expect(cashiersFromDrawouts(rows)).toEqual(["Moreen", "Brian", "Admin"]);
    expect(filterDrawoutsByCashiers(rows, ["moreen"]).map((r) => r.id)).toEqual(
      ["a", "c"],
    );
    expect(
      filterDrawoutsByCashiers(
        [
          ...rows,
          ...hubDrawoutsFromRecords([
            record({
              id: "d",
              initiatedByName: "Moreen Wanjiku",
              shiftCashierName: "Moreen Wanjiku",
            }),
          ]),
        ],
        ["moreen"],
      ).map((r) => r.id),
    ).toEqual(["a", "c", "d"]);
    expect(filterDrawoutsByCashiers(rows, []).map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("totals only approved and pending drawouts", () => {
    const rows = hubDrawoutsFromRecords([
      record({ id: "a", amount: 100, status: "APPROVED" }),
      record({ id: "b", amount: 50, status: "PENDING_APPROVAL" }),
      record({ id: "c", amount: 80, status: "REJECTED" }),
      record({ id: "d", amount: 20, status: "VOIDED" }),
    ]);
    expect(totalDrawoutAmount(rows)).toBe(150);
  });
});
