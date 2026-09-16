import type { ItemSummaryRecord, SupplierItemLinkRecord } from "@/lib/api";

export function supplierLinkToPickItem(
  link: SupplierItemLinkRecord,
): ItemSummaryRecord {
  return {
    id: link.itemId,
    name: link.itemName,
    sku: link.sku || "",
    barcode: link.barcode ?? undefined,
    variantOfItemId: link.variantOfItemId ?? undefined,
    parentName: link.parentItemName ?? undefined,
    variantName: link.variantName ?? undefined,
    packageVariant: link.packageVariant,
    thumbnailUrl: link.thumbnailUrl ?? undefined,
    buyingPrice: link.catalogBuyingPrice ?? link.defaultCostPrice ?? undefined,
  };
}

export function isPickableCatalogRow(item: ItemSummaryRecord): boolean {
  return item.groupLabelOnly !== true;
}

export function togglePickedItem(
  picked: ReadonlyMap<string, ItemSummaryRecord>,
  item: ItemSummaryRecord,
  taken: ReadonlySet<string>,
): Map<string, ItemSummaryRecord> {
  const next = new Map(picked);
  if (taken.has(item.id)) return next;
  if (next.has(item.id)) next.delete(item.id);
  else next.set(item.id, item);
  return next;
}

export function selectVisibleItems(
  picked: ReadonlyMap<string, ItemSummaryRecord>,
  visible: readonly ItemSummaryRecord[],
  taken: ReadonlySet<string>,
  select: boolean,
): Map<string, ItemSummaryRecord> {
  const next = new Map(picked);
  for (const item of visible) {
    if (taken.has(item.id) || !isPickableCatalogRow(item)) continue;
    if (select) next.set(item.id, item);
    else next.delete(item.id);
  }
  return next;
}

export function visibleSelectionState(
  visible: readonly ItemSummaryRecord[],
  picked: ReadonlyMap<string, ItemSummaryRecord>,
  taken: ReadonlySet<string>,
): { available: number; selected: number } {
  let available = 0;
  let selected = 0;
  for (const item of visible) {
    if (taken.has(item.id) || !isPickableCatalogRow(item)) continue;
    available += 1;
    if (picked.has(item.id)) selected += 1;
  }
  return { available, selected };
}
