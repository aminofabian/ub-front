import { describe, expect, test } from "bun:test";

import { resolveGeneratedCatalogIds } from "./resolve-generated-catalog";

describe("resolveGeneratedCatalogIds", () => {
  test("uses matched ids when present", async () => {
    const ids = await resolveGeneratedCatalogIds(
      {
        description: "Milk.",
        categoryId: "c1",
        itemTypeId: "d1",
      },
      {},
    );
    expect(ids).toEqual({ categoryId: "c1", itemTypeId: "d1" });
  });

  test("creates missing category and department when allowed", async () => {
    const ids = await resolveGeneratedCatalogIds(
      {
        description: "Apples.",
        createCategory: true,
        categoryName: "Fruit",
        createItemType: true,
        itemTypeName: "Produce",
      },
      {
        canCreateCategory: true,
        canCreateDepartment: true,
        createCategory: async (name) => ({ id: `cat-${name}` }),
        createDepartment: async (name) => ({ id: `dept-${name}` }),
      },
    );
    expect(ids).toEqual({ categoryId: "cat-Fruit", itemTypeId: "dept-Produce" });
  });

  test("skips create when the user cannot write taxonomy", async () => {
    const ids = await resolveGeneratedCatalogIds(
      {
        description: "Apples.",
        createCategory: true,
        categoryName: "Fruit",
        createItemType: true,
        itemTypeName: "Produce",
      },
      {},
    );
    expect(ids).toEqual({});
  });
});
