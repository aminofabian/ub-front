import { describe, expect, test } from "bun:test";

import { unitCostFromLineTotal } from "./supply-line-metric-cells";

describe("unitCostFromLineTotal", () => {
  test("divides total by qty", () => {
    expect(unitCostFromLineTotal(10, 1480)).toBe("148");
    expect(unitCostFromLineTotal(2, 295)).toBe("147.5");
  });

  test("keeps up to four decimal places", () => {
    expect(unitCostFromLineTotal(3, 100)).toBe("33.3333");
  });

  test("rejects invalid qty or total", () => {
    expect(unitCostFromLineTotal(0, 100)).toBe("");
    expect(unitCostFromLineTotal(-1, 100)).toBe("");
    expect(unitCostFromLineTotal(2, -5)).toBe("");
  });
});
