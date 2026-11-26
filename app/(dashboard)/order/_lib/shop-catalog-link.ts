import { cashierItemPrimaryLabel } from "@/lib/cashier-item-display";
import {
  fetchItems,
  type ItemSummaryRecord,
  type SupplierItemLinkRecord,
} from "@/lib/api";

const SHOP_SEARCH_MIN = 2;
const SHOP_SEARCH_SIZE = 40;

/** A shop product shaped like a supplier link so the order shelf can show it. */
export function shopItemAsSupplierLink(
  item: ItemSummaryRecord,
): SupplierItemLinkRecord {
  return {
    id: `shop:${item.id}`,
    itemId: item.id,
    itemName: cashierItemPrimaryLabel(item),
    sku: item.sku ?? "",
    barcode: item.barcode ?? null,
    thumbnailUrl: item.thumbnailUrl ?? null,
    currentStock: item.stockQty ?? null,
    primary: false,
    catalogBuyingPrice: item.buyingPrice ?? null,
    catalogShelfPrice: item.sellingPrice ?? item.bundlePrice ?? null,
    active: item.active !== false,
    variantOfItemId: item.variantOfItemId ?? null,
    parentItemName: item.parentName ?? null,
    variantName: item.variantName ?? null,
    packageVariant: item.packageVariant === true,
    itemTypeId: item.itemTypeId ?? null,
  };
}

/** Shop catalogue matches, including family names such as Terere or Managu. */
export async function fetchShopCatalogLinks(
  query: string,
): Promise<SupplierItemLinkRecord[]> {
  const q = query.trim();
  if (q.length < SHOP_SEARCH_MIN) return [];
  const rows = await fetchItems(q, {
    size: SHOP_SEARCH_SIZE,
    catalogScope: "ALL",
    softAuth: true,
  });
  return rows.map(shopItemAsSupplierLink);
}
