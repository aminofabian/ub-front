/**
 * Pack / shared-stock SKUs sell whole packs (tray, crate, …) and deduct from
 * the parent pool. They must never be marked weighed — kg × unitsPerSale
 * would book a spurious stock loss.
 */
export function isPackSellSku(
  row:
    | {
        packageVariant?: boolean | null;
        variantOfItemId?: string | null;
        packageUnitsPerSale?: number | string | null;
        packagingUnitQty?: number | string | null;
        isStocked?: boolean | null;
      }
    | null
    | undefined,
): boolean {
  if (!row) return false;
  if (row.packageVariant === true) return true;
  const parentId = row.variantOfItemId?.trim();
  if (!parentId) return false;
  const raw = row.packageUnitsPerSale ?? row.packagingUnitQty;
  const units = raw == null || raw === "" ? NaN : Number(raw);
  if (!Number.isFinite(units) || units <= 0) return false;
  if (row.isStocked === false) return true;
  return units > 1;
}
