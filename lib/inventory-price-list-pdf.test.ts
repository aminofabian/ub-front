import { describe, expect, it } from "vitest";

import {
  buildInventoryPriceListPdf,
  inventoryPriceListFilename,
  type InventoryPriceListItem,
} from "./inventory-price-list-pdf";

const WHEN = new Date(2026, 9, 4);

const MILK: InventoryPriceListItem = {
  name: "Brookside Fresh Milk 500ml",
  category: "Dairy",
  buyPrice: 85,
  sellPrice: 110,
};

async function pdfText(
  mode: "sell" | "both",
  items: InventoryPriceListItem[],
  scope?: string,
): Promise<string> {
  const blob = buildInventoryPriceListPdf({
    mode,
    businessName: "Palmart",
    branchName: "Mirema",
    scope,
    currency: "KES",
    generatedAt: WHEN,
    items,
  });
  return blob.text();
}

describe("inventory price list pdf", () => {
  it("prints the name and selling price, and leaves the buying price off the shop copy", async () => {
    const text = await pdfText("sell", [MILK]);
    expect(text).toContain("Brookside Fresh Milk 500ml");
    expect(text).toContain("(110)");
    expect(text).toContain("Selling prices");
    expect(text).not.toContain("(85)");
    expect(text).not.toContain("BUYING");
  });

  it("prints buying and selling on the staff copy", async () => {
    const text = await pdfText("both", [MILK]);
    expect(text).toContain("(85)");
    expect(text).toContain("(110)");
    expect(text).toContain("Buying and selling prices");
    expect(text).toContain("BUYING");
    expect(text).toContain("Staff copy");
  });

  it("groups items under a category heading", async () => {
    const text = await pdfText("sell", [MILK]);
    expect(text).toContain("DAIRY");
    expect(text).toContain("Palmart");
    expect(text).toContain("Mirema");
    expect(text).toContain("4 Oct 2026");
  });

  it("keeps a filtered scope line and a thousands separator", async () => {
    const text = await pdfText(
      "both",
      [{ name: "Rice 50kg", category: "Grains", buyPrice: 4200, sellPrice: 12500 }],
      "Search: rice",
    );
    expect(text).toContain("Search: rice");
    expect(text).toContain("12,500");
    expect(text).toContain("4,200");
  });

  it("still builds a sheet when nothing matches", async () => {
    const text = await pdfText("sell", []);
    expect(text).toContain("No items match this view.");
    expect(text).toContain("/Count 1");
  });

  it("continues a category onto the next page", async () => {
    const items = Array.from({ length: 70 }, (_, index) => ({
      name: `Item ${String(index + 1).padStart(2, "0")}`,
      category: "Beverages",
      buyPrice: 10,
      sellPrice: 20,
    }));
    const text = await pdfText("both", items);
    expect(text).toContain("/Count 2");
    expect(text).toContain("continued");
  });

  it("names the file from the shop, the price columns, and the day", () => {
    expect(inventoryPriceListFilename("Palmart Mirema", "sell", WHEN)).toBe(
      "palmart-mirema-selling-prices-2026-10-04.pdf",
    );
    expect(inventoryPriceListFilename("Palmart", "both", WHEN)).toBe(
      "palmart-buy-sell-prices-2026-10-04.pdf",
    );
  });
});
