import { describe, expect, it } from "bun:test";

import {
  captureLinkedPct,
  directoryCustomerId,
  isWholesaleShaped,
  medianNumber,
} from "@/lib/customer-spend-lists";

describe("medianNumber", () => {
  it("returns the middle value", () => {
    expect(medianNumber([100, 300, 200])).toBe(200);
    expect(medianNumber([10, 20])).toBe(15);
    expect(medianNumber([])).toBe(0);
  });
});

describe("isWholesaleShaped", () => {
  it("flags large repeat baskets against the shop median", () => {
    expect(isWholesaleShaped(12_000, 3, 800)).toBe(true);
    expect(isWholesaleShaped(1_500, 4, 800)).toBe(false);
    expect(isWholesaleShaped(12_000, 1, 800)).toBe(false);
  });
});

describe("captureLinkedPct", () => {
  it("is named tills over named plus walk-ins", () => {
    expect(captureLinkedPct(25, 75)).toBe(25);
    expect(captureLinkedPct(0, 0)).toBe(0);
  });
});

describe("directoryCustomerId", () => {
  it("drops M-Pesa inferred keys", () => {
    expect(directoryCustomerId("cust-1")).toBe("cust-1");
    expect(directoryCustomerId("mpesa:2547")).toBeNull();
  });
});
