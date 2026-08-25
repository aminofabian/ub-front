import { describe, expect, test } from "bun:test";

import { categorySelectOptions } from "./category-select-options";

describe("categorySelectOptions", () => {
  test("marks duplicate names with parent", () => {
    const rows = categorySelectOptions([
      { id: "h", name: "Household", active: true, parentId: null },
      { id: "b1", name: "Bleach", active: true, parentId: "h" },
      { id: "b2", name: "Bleach", active: true, parentId: null },
    ]);
    const bleaches = rows.filter((r) => r.label === "Bleach");
    expect(bleaches).toHaveLength(2);
    expect(bleaches.some((r) => r.hint === "Household")).toBe(true);
  });
});
