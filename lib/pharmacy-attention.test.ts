import { describe, expect, test } from "bun:test";

import type { PharmacyDashboard } from "./pharmacy-api";
import { pharmacyAttention, sentenceFromList } from "./pharmacy-attention";

function dashboard(over: Partial<PharmacyDashboard> = {}): PharmacyDashboard {
  return {
    medicines: { total: 10, unclassified: 0, otc: 6, prescriptionOnly: 4, controlled: 0 },
    stock: { quarantined: 0, expired: 0, shortDated: 0, shortDatedDays: 90, medicineMissingDetails: 0 },
    dispensedToday: 0,
    awaitingSecondCheck: null,
    premisesLicenceNo: null,
    licenceExpiresOn: null,
    licenceDaysLeft: null,
    controlledSalesEnabled: false,
    dispensingStaff: 1,
    dispensingStaffWithoutPin: 0,
    checklist: [],
    ...over,
  } as PharmacyDashboard;
}

describe("pharmacyAttention", () => {
  test("a pharmacy with nothing outstanding has nothing to say", () => {
    expect(pharmacyAttention(dashboard(), { canReadStock: true })).toEqual({ urgent: [], routine: [] });
    expect(pharmacyAttention(null, { canReadStock: true })).toEqual({ urgent: [], routine: [] });
  });

  test("what blocks a sale is urgent, the rest is routine", () => {
    const a = pharmacyAttention(
      dashboard({
        medicines: { total: 10, unclassified: 3, otc: 4, prescriptionOnly: 3, controlled: 0 },
        stock: { quarantined: 2, expired: 1, shortDated: 5, shortDatedDays: 90, medicineMissingDetails: 0 },
        licenceDaysLeft: 12,
        awaitingSecondCheck: 4,
      }),
      { canReadStock: true },
    );
    expect(a.urgent).toEqual([
      "3 medicines cannot be sold until they have a class",
      "1 expired batch is still on the shelf",
    ]);
    expect(a.routine).toEqual([
      "the premises licence expires in 12 days",
      "4 dispensing records are waiting for a second check",
      "2 batches are in quarantine",
      "5 batches expire within 90 days",
    ]);
  });

  test("a lapsed licence is urgent", () => {
    expect(pharmacyAttention(dashboard({ licenceDaysLeft: -3 }), { canReadStock: true }).urgent).toEqual([
      "the premises licence date has passed",
    ]);
  });

  test("someone who cannot see stock is not told about batches", () => {
    const a = pharmacyAttention(
      dashboard({ stock: { quarantined: 2, expired: 1, shortDated: 5, shortDatedDays: 90, medicineMissingDetails: 7 } }),
      { canReadStock: false },
    );
    expect(a).toEqual({ urgent: [], routine: [] });
  });
});

describe("sentenceFromList", () => {
  test("joins with commas and a final and", () => {
    expect(sentenceFromList([])).toBe("");
    expect(sentenceFromList(["one thing"])).toBe("One thing.");
    expect(sentenceFromList(["a", "b", "c"])).toBe("A, b and c.");
  });
});
