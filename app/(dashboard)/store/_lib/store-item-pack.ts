import type {
  ItemDetailRecord,
  ItemLinkPackOfferRecord,
  ItemPackOptionRecord,
} from "@/lib/api";
import type { SupplyPackMode } from "@/lib/supply-pack-math";
import { formatSupplyQty } from "@/lib/supply-pack-math";

export type StorePackCatalog = {
  itemId: string;
  /** Holder units per catalog display unit. 1 for each; 30 for a tray SKU. */
  displayToHolderFactor: number;
  catalogPackUnit: string;
  options: ItemPackOptionRecord[];
};

function roundQty(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function positiveQty(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function storePackCatalogFromItem(
  itemId: string,
  detail: ItemDetailRecord,
  options: ItemPackOptionRecord[],
): StorePackCatalog {
  const fromSale = positiveQty(detail.packageUnitsPerSale);
  const fromPackaging = positiveQty(detail.packagingUnitQty);
  const isPackage =
    detail.packageVariant === true ||
    (fromSale != null && Boolean(detail.variantOfItemId));
  const factor =
    isPackage && fromSale != null
      ? fromSale
      : isPackage && fromPackaging != null
        ? fromPackaging
        : 1;
  const unit =
    detail.packagingUnitName?.trim() ||
    (factor > 1 ? "pack" : "each");
  return {
    itemId,
    displayToHolderFactor: factor,
    catalogPackUnit: unit,
    options: options.filter((o) => o.active && o.unitsPerPack > 1),
  };
}

/** Native pack for a package-variant SKU; null means count in catalog display units. */
export function catalogNativePack(
  catalog: StorePackCatalog | null,
): SupplyPackMode | null {
  if (!catalog || catalog.displayToHolderFactor <= 1) return null;
  return {
    unitsPerPack: catalog.displayToHolderFactor,
    packUnit: catalog.catalogPackUnit,
  };
}

export function isPacked(pack: SupplyPackMode | null | undefined): boolean {
  return pack != null && pack.unitsPerPack > 1;
}

/** Convert typed packs into catalog display units (what inventoryQuantity uses). */
export function packsToCatalogDisplay(
  packs: number,
  pack: SupplyPackMode | null | undefined,
  displayToHolderFactor: number,
): number {
  if (!Number.isFinite(packs) || packs < 0) return 0;
  const factor =
    Number.isFinite(displayToHolderFactor) && displayToHolderFactor > 0
      ? displayToHolderFactor
      : 1;
  if (!isPacked(pack)) return roundQty(packs);
  const holder = packs * pack!.unitsPerPack;
  return roundQty(holder / factor);
}

/** Show current catalog display qty in the selected pack unit. */
export function catalogDisplayToPacks(
  display: number,
  pack: SupplyPackMode | null | undefined,
  displayToHolderFactor: number,
): number {
  if (!Number.isFinite(display) || display < 0) return 0;
  const factor =
    Number.isFinite(displayToHolderFactor) && displayToHolderFactor > 0
      ? displayToHolderFactor
      : 1;
  if (!isPacked(pack)) return roundQty(display);
  const holder = display * factor;
  return roundQty(holder / pack!.unitsPerPack);
}

export function packCountPreview(
  packs: number | null,
  pack: SupplyPackMode | null | undefined,
): string | null {
  if (packs == null || !isPacked(pack)) return null;
  const pieces = roundQty(packs * pack!.unitsPerPack);
  const unit = pack!.packUnit.trim() || "pack";
  return `${formatSupplyQty(packs)} × ${formatSupplyQty(pack!.unitsPerPack)} = ${formatSupplyQty(pieces)} each`;
}

export function packOffersFromOptions(
  options: ItemPackOptionRecord[],
): ItemLinkPackOfferRecord[] {
  return options.map((option) => {
    const price =
      option.defaultPackPrice == null ? null : Number(option.defaultPackPrice);
    const units = Number(option.unitsPerPack);
    return {
      id: option.id,
      label: option.label,
      packUnit: option.packUnit,
      unitsPerPack: units,
      unitPrice: Number.isFinite(price) ? price : null,
      eachPrice:
        price != null && Number.isFinite(price) && units > 0
          ? Math.round((price / units) * 100) / 100
          : null,
    };
  });
}

export function retargetCount(
  typed: number,
  from: SupplyPackMode | null,
  to: SupplyPackMode | null,
  displayToHolderFactor: number,
): number {
  const display = packsToCatalogDisplay(typed, from, displayToHolderFactor);
  return catalogDisplayToPacks(display, to, displayToHolderFactor);
}
