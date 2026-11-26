import { describe, expect, test } from "vitest";

import {
  clerkSupplierItemTypeIds,
  filterLinksByItemTypes,
} from "./clerk-supplier-scope";
import type { MeResponse } from "./api";

function me(partial: Partial<MeResponse> & Pick<MeResponse, "id">): MeResponse {
  return {
    name: "Test",
    email: "t@example.com",
    status: "ACTIVE",
    ...partial,
  };
}

describe("clerkSupplierItemTypeIds", () => {
  test("assignments always restrict", () => {
    expect(
      clerkSupplierItemTypeIds(
        me({ id: "1", itemTypeIds: [" a ", "b", "a"], role: { key: "admin" } }),
      ),
    ).toEqual(["a", "b"]);
  });

  test("grocery clerk with none gets empty scope", () => {
    expect(
      clerkSupplierItemTypeIds(
        me({ id: "1", itemTypeIds: [], role: { key: "grocery_clerk" } }),
      ),
    ).toEqual([]);
  });

  test("owner with none is unfiltered", () => {
    expect(
      clerkSupplierItemTypeIds(
        me({ id: "1", role: { key: "owner" } }),
      ),
    ).toBeUndefined();
  });
});

describe("filterLinksByItemTypes", () => {
  const links = [
    { id: "1", itemTypeId: "dept-a" },
    { id: "2", itemTypeId: "dept-b" },
    { id: "3", itemTypeId: null },
  ];

  test("undefined scope keeps all", () => {
    expect(filterLinksByItemTypes(links, undefined)).toEqual(links);
  });

  test("empty scope drops all", () => {
    expect(filterLinksByItemTypes(links, [])).toEqual([]);
  });

  test("ids keep matching only", () => {
    expect(filterLinksByItemTypes(links, ["dept-a"])).toEqual([
      { id: "1", itemTypeId: "dept-a" },
    ]);
  });
});
