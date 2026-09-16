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
  /**
   * Absolute each/on-hand at the branch when known (base pool for package
   * variants). Used to show "1 pack, 26 singles" instead of a floored tray count.
   */
  holderEach: number | null;
};

function roundQty(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function positiveQty(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nonNegQty(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
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
  const holderEach =
    nonNegQty(detail.baseStockQty) ??
    (factor <= 1 ? nonNegQty(detail.stockQty) : null);
  return {
    itemId,
    displayToHolderFactor: factor,
    catalogPackUnit: unit,
    options: options.filter((o) => o.active && o.unitsPerPack > 1),
    holderEach,
  };
}

/** Total each for pack/singles labels — prefer the holder pool when we have it. */
export function packStockEach(
  displayCount: number,
  catalog: StorePackCatalog | null,
): number {
  if (catalog?.holderEach != null) return catalog.holderEach;
  const factor = catalog?.displayToHolderFactor ?? 1;
  if (factor > 1) return roundQty(displayCount * factor);
  return displayCount;
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

/**
 * Convert a typed count into catalog display units (what inventoryQuantity uses).
 * Unpacked counts are pieces; packed counts are packs of `pack.unitsPerPack`.
 */
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
  const holder = isPacked(pack) ? packs * pack!.unitsPerPack : packs;
  return roundQty(holder / factor);
}

/**
 * Show catalog display qty as packs, or as pieces when unpacked.
 */
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
  const holder = display * factor;
  if (!isPacked(pack)) return roundQty(holder);
  return roundQty(holder / pack!.unitsPerPack);
}

/** Whole packs + leftover each from a total piece count. */
export function splitPacksAndSingles(
  totalEach: number,
  unitsPerPack: number,
): { packs: number; singles: number; each: number } {
  const each =
    Number.isFinite(totalEach) && totalEach > 0 ? roundQty(totalEach) : 0;
  const size =
    Number.isFinite(unitsPerPack) && unitsPerPack > 1 ? unitsPerPack : 1;
  if (size <= 1) {
    return { packs: 0, singles: each, each };
  }
  const packs = Math.floor(each / size + 1e-9);
  const singles = roundQty(each - packs * size);
  return { packs, singles, each };
}

/**
 * Human label for stock counted in packs — e.g. 56 each @ 30 →
 * "1 pack(s), 26 singles".
 */
export function packBreakdownLabel(
  totalEach: number,
  pack: SupplyPackMode | null | undefined,
): string | null {
  if (!isPacked(pack)) return null;
  const { packs, singles, each } = splitPacksAndSingles(
    totalEach,
    pack!.unitsPerPack,
  );
  const unit = (pack!.packUnit.trim() || "pack").toLowerCase();
  const packWord = `${unit}(s)`;
  if (each <= 0) {
    return `0 ${packWord}`;
  }
  if (singles < 0.0001) {
    return `${formatSupplyQty(packs)} ${packWord}`;
  }
  if (packs <= 0) {
    return `${formatSupplyQty(singles)} singles`;
  }
  return `${formatSupplyQty(packs)} ${packWord}, ${formatSupplyQty(singles)} singles`;
}

export function packCountPreview(
  packs: number | null,
  pack: SupplyPackMode | null | undefined,
): string | null {
  if (packs == null || !isPacked(pack)) return null;
  const each = roundQty(packs * pack!.unitsPerPack);
  const breakdown = packBreakdownLabel(each, pack);
  if (!breakdown) return null;
  return `${breakdown} · ${formatSupplyQty(each)} each`;
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

/** Size to start with when the user switches from pieces to packs. */
export function defaultPackMode(
  catalog: StorePackCatalog | null,
): SupplyPackMode {
  const native = catalogNativePack(catalog);
  if (native) return native;
  const option = catalog?.options[0];
  if (option && option.unitsPerPack > 1) {
    return {
      unitsPerPack: option.unitsPerPack,
      packUnit: option.packUnit || "pack",
    };
  }
  return { unitsPerPack: 12, packUnit: "pack" };
}

export function packSizeChoices(
  catalog: StorePackCatalog | null,
): { units: number; label: string }[] {
  const seen = new Set<number>();
  const choices: { units: number; label: string }[] = [];
  const add = (units: number, label: string) => {
    if (!(units > 1) || seen.has(units)) return;
    seen.add(units);
    choices.push({ units, label });
  };
  if (catalog && catalog.displayToHolderFactor > 1) {
    add(
      catalog.displayToHolderFactor,
      catalog.catalogPackUnit || "pack",
    );
  }
  for (const option of catalog?.options ?? []) {
    add(option.unitsPerPack, option.packUnit || option.label || "pack");
  }
  return choices;
}

/** One sentence for what the typed count will do. */
export function countSaveHint(
  typed: number | null,
  pack: SupplyPackMode | null | undefined,
  intent: "set" | "move",
): string {
  if (typed == null) {
    return isPacked(pack)
      ? "Enter how many packs."
      : "Enter how many pieces.";
  }
  if (!isPacked(pack)) {
    const pieces = formatSupplyQty(typed);
    return intent === "move"
      ? `This is ${pieces} pieces.`
      : `Save sets on-hand to ${pieces} pieces.`;
  }
  const size = pack!.unitsPerPack;
  const each = roundQty(typed * size);
  const packs = formatSupplyQty(typed);
  const pieces = formatSupplyQty(each);
  const sizeLabel = formatSupplyQty(size);
  return intent === "move"
    ? `This is ${pieces} pieces (${packs} × ${sizeLabel}).`
    : `Save sets on-hand to ${pieces} pieces (${packs} × ${sizeLabel}).`;
}
