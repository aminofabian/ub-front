import { describe, expect, test } from "bun:test";

import type { ItemSummaryRecord } from "@/lib/api";
import { catalogRecommendTokens } from "@/lib/theme-try-on";

function item(
  name: string,
  extras: Partial<ItemSummaryRecord> = {},
): ItemSummaryRecord {
  return { id: name, name, sku: name, ...extras };
}

describe("catalogRecommendTokens", () => {
  test("lists unique categories before product names", () => {
    expect(
      catalogRecommendTokens([
        item("Beef chuck", { categoryName: "Meat" }),
        item("Goat", { categoryName: "Meat" }),
        item("Milk"),
      ]),
    ).toEqual(["Meat", "Beef chuck", "Goat", "Milk"]);
  });

  test("skips group-label rows for names", () => {
    expect(
      catalogRecommendTokens([
        item("Cuts", { groupLabelOnly: true, categoryName: "Meat" }),
      ]),
    ).toEqual(["Meat"]);
  });
});
