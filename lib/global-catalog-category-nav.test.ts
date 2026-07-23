import { describe, expect, test } from "bun:test";
import { flattenGlobalCategoriesForNav } from "./global-catalog-category-nav";

describe("flattenGlobalCategoriesForNav", () => {
  test("nests children under parents by parentId", () => {
    const flat = flattenGlobalCategoriesForNav([
      { id: "c", name: "Citrus", slug: "citrus", position: 0, parentId: "f" },
      { id: "f", name: "Fruit", slug: "fruit", position: 1, parentId: null },
      { id: "d", name: "Dairy", slug: "dairy", position: 0, parentId: null },
      { id: "m", name: "Milk", slug: "milk", position: 0, parentId: "d" },
    ]);
    expect(flat.map((n) => `${n.depth}:${n.name}`)).toEqual([
      "0:Dairy",
      "1:Milk",
      "0:Fruit",
      "1:Citrus",
    ]);
  });

  test("treats missing parent as root", () => {
    const flat = flattenGlobalCategoriesForNav([
      { id: "x", name: "Orphan", slug: "orphan", position: 0, parentId: "missing" },
    ]);
    expect(flat).toHaveLength(1);
    expect(flat[0]?.depth).toBe(0);
  });
});
