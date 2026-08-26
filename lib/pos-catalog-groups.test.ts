import { describe, expect, it } from "vitest";

import type { ItemSummaryRecord } from "@/lib/api";
import { groupPosCatalogHits } from "@/lib/pos-catalog-groups";

function item(
  partial: Partial<ItemSummaryRecord> & Pick<ItemSummaryRecord, "id" | "name">,
): ItemSummaryRecord {
  return {
    sku: partial.sku ?? partial.id,
    ...partial,
  };
}

describe("groupPosCatalogHits", () => {
  it("keeps standalone rows flat", () => {
    const hits = [
      item({ id: "a", name: "Milk", sku: "MILK" }),
      item({ id: "b", name: "Bread", sku: "BREAD" }),
    ];
    const blocks = groupPosCatalogHits(hits);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: "standalone", item: { id: "a" } });
    expect(blocks[1]).toMatchObject({ kind: "standalone", item: { id: "b" } });
  });

  it("groups linked variants into one block", () => {
    const hits = [
      item({
        id: "v8",
        name: "Dry Brass Hook",
        sku: "DRYBR-8",
        size: "8",
        variantOfItemId: "parent",
      }),
      item({
        id: "v10",
        name: "Dry Brass Hook",
        sku: "DRYBR-10",
        size: "10",
        variantOfItemId: "parent",
      }),
      item({ id: "coke", name: "Coke 500ml", sku: "COKE-500" }),
    ];
    const blocks = groupPosCatalogHits(hits);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.kind).toBe("variantGroup");
    if (blocks[0]?.kind === "variantGroup") {
      expect(blocks[0].parentId).toBe("parent");
      expect(blocks[0].variants.map((v) => v.id)).toEqual(["v8", "v10"]);
    }
    expect(blocks[1]).toMatchObject({ kind: "standalone", item: { id: "coke" } });
  });

  it("omits groupLabelOnly parent when children are present", () => {
    const hits = [
      item({
        id: "parent",
        name: "Dry Brass Hooks",
        sku: "DRYBR",
        groupLabelOnly: true,
      }),
      item({
        id: "v8",
        name: "Dry Brass Hook",
        sku: "DRYBR-8",
        size: "8",
        variantOfItemId: "parent",
      }),
      item({
        id: "v12",
        name: "Dry Brass Hook",
        sku: "DRYBR-12",
        size: "12",
        variantOfItemId: "parent",
      }),
    ];
    const blocks = groupPosCatalogHits(hits);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe("variantGroup");
    if (blocks[0]?.kind === "variantGroup") {
      expect(blocks[0].title).toMatch(/Dry Brass/i);
      expect(blocks[0].variants).toHaveLength(2);
    }
  });

  it("leaves a single linked child as standalone", () => {
    const hits = [
      item({
        id: "v8",
        name: "Dry Brass Hook",
        sku: "DRYBR-8",
        size: "8",
        variantOfItemId: "parent",
      }),
    ];
    const blocks = groupPosCatalogHits(hits);
    expect(blocks).toEqual([
      expect.objectContaining({
        kind: "standalone",
        item: expect.objectContaining({ id: "v8" }),
      }),
    ]);
  });
});
