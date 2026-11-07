import type { ItemDetailRecord, ItemSummaryRecord } from "@/lib/api";
import { toAmount, wasPriceFromCatalog } from "@/lib/price-tags/money";
import type { TagProduct } from "@/lib/price-tags/types";

export function tagProductFromSummary(row: ItemSummaryRecord): TagProduct | null {
  if (row.groupLabelOnly) return null;
  if (row.isSellable === false) return null;
  if (row.active === false) return null;
  const sellingPrice = toAmount(row.sellingPrice);
  const bundle = toAmount(row.bundlePrice);
  const unitType = row.unitType?.trim() || (row.isWeighed ? "kg" : "");
  return {
    id: row.id,
    name: row.name?.trim() || row.sku || "Untitled",
    sku: row.sku?.trim() ?? "",
    barcode: row.barcode?.trim() ?? "",
    categoryName: row.categoryName?.trim() ?? "",
    unitType,
    sellingPrice,
    catalogWasPrice: wasPriceFromCatalog(sellingPrice, bundle),
    // A weighed item's shelf price is meaningless without its unit.
    pricePer: row.isWeighed ? unitType || "kg" : "",
  };
}

export function tagProductFromDetail(row: ItemDetailRecord): TagProduct | null {
  return tagProductFromSummary(row);
}
