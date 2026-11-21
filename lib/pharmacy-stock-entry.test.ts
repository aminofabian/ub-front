import { describe, expect, test } from "bun:test";

import { medicineStockRowProblem, todayIso } from "./pharmacy-stock-entry";

const ok = { quantity: "24", unitCost: "", lotNumber: "AMX2291", expiryDate: "2027-03-31" };

describe("medicineStockRowProblem", () => {
  test("a complete row can be saved, with or without a cost", () => {
    expect(medicineStockRowProblem(ok, "2026-11-21")).toBeNull();
    expect(medicineStockRowProblem({ ...ok, unitCost: "12.50" }, "2026-11-21")).toBeNull();
  });

  test("each missing piece is named", () => {
    expect(medicineStockRowProblem({ ...ok, quantity: "" }, "2026-11-21")).toBe("Enter how many.");
    expect(medicineStockRowProblem({ ...ok, quantity: "0" }, "2026-11-21")).toBe("Enter how many.");
    expect(medicineStockRowProblem({ ...ok, lotNumber: "  " }, "2026-11-21")).toContain("lot number");
    expect(medicineStockRowProblem({ ...ok, expiryDate: "" }, "2026-11-21")).toContain("expiry date");
    expect(medicineStockRowProblem({ ...ok, unitCost: "abc" }, "2026-11-21")).toContain("cost");
  });

  test("expired stock is refused, stock expiring today is not", () => {
    expect(medicineStockRowProblem({ ...ok, expiryDate: "2026-11-20" }, "2026-11-21")).toContain("expired");
    expect(medicineStockRowProblem({ ...ok, expiryDate: "2026-11-21" }, "2026-11-21")).toBeNull();
  });
});

test("todayIso pads the month and day", () => {
  expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
});
