import {
  ApiRequestError,
  isAuthRecoveryError,
  type CreateVariantPayload,
  type ItemDetailRecord,
  type ItemImageRecord,
  type PatchItemPayload,
} from "@/lib/api";
import { DEFAULT_PROBLEM_TITLE } from "@/lib/problem";
import { type PackageDraft, type VariantDraft } from "./_types";

// ─── numeric helpers ──────────────────────────────────────────────────────────

/** User-visible message for catalog/inventory mutation failures (includes API errors). */
export function formatMutationError(
  error: unknown,
  fallback = DEFAULT_PROBLEM_TITLE,
): string {
  if (isAuthRecoveryError(error)) return "";
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function toNumber(
  value: number | string | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolves the unit cost shown for a supplier link: agreed default, then last
 * purchase cost (updated when receiving supply), then optional catalog fallback.
 */
export function effectiveSupplierUnitCost(
  link:
    | {
        defaultCostPrice?: number | string | null;
        lastCostPrice?: number | string | null;
      }
    | null
    | undefined,
  itemBuyingPrice?: number | string | null,
): number | null {
  const buy = toNumber(itemBuyingPrice);
  const def = toNumber(link?.defaultCostPrice);
  const last = toNumber(link?.lastCostPrice);
  if (link) {
    return def ?? last ?? buy ?? null;
  }
  return buy ?? null;
}

/** Base product id for variants/packages (never a child variant id). */
export function resolveCatalogParentId(
  detail: { id: string; variantOfItemId?: string | null } | null,
  selectedId: string | null,
): string | null {
  if (detail?.variantOfItemId?.trim()) {
    return detail.variantOfItemId.trim();
  }
  if (detail?.id?.trim()) {
    return detail.id.trim();
  }
  return selectedId?.trim() || null;
}

/** Package sale or shared-stock variant — inventory lives on the parent product. */
export function usesSharedPackageStock(
  row:
    | {
        packageVariant?: boolean;
        variantOfItemId?: string | null;
        isStocked?: boolean;
        packageUnitsPerSale?: number | string | null;
        packagingUnitQty?: number | string | null;
        baseStockQty?: number | string | null;
      }
    | null
    | undefined,
): boolean {
  if (!row) return false;
  if (row.packageVariant) return true;
  const parentId = row.variantOfItemId?.trim();
  if (!parentId) return false;
  // The server reports a base count only for units that draw from the base
  // product — including an ordinary option in a product that sells packs.
  if (toNumber(row.baseStockQty) != null) return true;
  const units = packageUnitsPerSaleFromRow(row);
  return units != null && row.isStocked === false;
}

/** Parent catalog id when stock is shared; otherwise the row itself. */
export function stockCatalogItemId(
  row: {
    id: string;
    variantOfItemId?: string | null;
    packageVariant?: boolean;
    isStocked?: boolean;
  } & {
    packageUnitsPerSale?: number | string | null;
    packagingUnitQty?: number | string | null;
  },
): string {
  if (usesSharedPackageStock(row)) {
    const parent = row.variantOfItemId?.trim();
    if (parent) return parent;
  }
  return row.id;
}

/** Conversion factor for package / shared-stock SKUs (API list field or detail packagingUnitQty). */
export function packageUnitsPerSaleFromRow(
  row:
    | {
        packageUnitsPerSale?: number | string | null;
        packagingUnitQty?: number | string | null;
      }
    | null
    | undefined,
): number | null {
  if (!row) return null;
  return toNumber(row.packageUnitsPerSale) ?? toNumber(row.packagingUnitQty);
}

/** Normalize item detail so package fields work in list + detail UIs. */
export function normalizeItemDetail<T extends ItemDetailRecord>(row: T): T {
  const units = packageUnitsPerSaleFromRow(row);
  return {
    ...row,
    packageUnitsPerSale: row.packageUnitsPerSale ?? units ?? undefined,
  };
}

export type PackStockBlock = { names: string[] };

/**
 * A pack draws only from the parent's own on-hand pool. When that pool is empty
 * but a normal option SKU holds the count, the pack would read 0 packs forever —
 * flag the SKUs the shopkeeper needs to move first.
 */
export function packStockBlock(
  parent:
    | {
        baseStockQty?: number | string | null;
        stockQty?: number | string | null;
        variants?: Array<{
          id: string;
          packageVariant?: boolean;
          stockQty?: number | string | null;
          variantName?: string | null;
          name?: string | null;
          sku?: string | null;
        }> | null;
      }
    | null
    | undefined,
  parentId: string,
): PackStockBlock | null {
  if (!parent) return null;
  const basePool =
    toNumber(parent.baseStockQty) ?? toNumber(parent.stockQty) ?? 0;
  if (basePool > 0) return null;
  const names = (parent.variants ?? [])
    .filter(
      (v) =>
        v.id !== parentId &&
        !v.packageVariant &&
        (toNumber(v.stockQty) ?? 0) > 0,
    )
    .map(
      (v) =>
        v.variantName?.trim() ||
        v.name?.trim() ||
        v.sku?.trim() ||
        "another SKU",
    );
  return names.length > 0 ? { names } : null;
}

/**
 * True only for a real multi-unit package. One unit per sale is the base unit
 * itself — a shared selling unit, never a "pack of 1".
 */
export function isPackUnits(units: number | null | undefined): boolean {
  return units != null && Number.isFinite(units) && units > 1;
}

/** Short catalog chip: "50/pack". */
export function packChipLabel(units: number | null | undefined): string {
  if (units == null || !(units > 0)) return "Pack";
  if (!isPackUnits(units)) return "Each";
  const shown = Number.isInteger(units)
    ? String(units)
    : units.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${shown}/pack`;
}

/** "1 pack = 50 Eggs" — the line a shop owner should see for a pack. */
export function packEqualsLabel(
  units: number | null | undefined,
  source?: string | null,
): string {
  const name = source?.trim();
  if (units == null || !(units > 0)) {
    return name ? `Pack of ${name}` : "Pack";
  }
  if (!isPackUnits(units)) {
    return name ? `1 ${name} at a time` : "One at a time";
  }
  const shown = Number.isInteger(units)
    ? units.toLocaleString()
    : units.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return name ? `1 pack = ${shown} ${name}` : `1 pack = ${shown}`;
}

export function packEditHint(unitsRaw: string, source?: string | null): string {
  const units = toNumber(unitsRaw);
  const name = source?.trim() || "the product";
  if (units != null && units > 1) {
    return `${packEqualsLabel(units, name)}. Each sale takes that many off the shelf.`;
  }
  if (units === 1) {
    return `Sells one ${name} at a time from the same shelf — not a pack.`;
  }
  return `Type how many ${name} are in one pack.`;
}

export type VariantSellShape = {
  packageVariant: boolean;
  packagingUnitQty: number;
  packagingUnitName: string;
  isStocked: false;
  isWeighed?: false;
};

/**
 * Maps a variant's "how many leave the shelf" value to catalog flags.
 *
 * - checked "Sell as a pack", or more than one unit → a package SKU
 * - exactly one unit, unchecked → a shared selling unit: draws one base unit
 *   from the product's shelf and is never labelled or counted as a pack
 */
export function variantSellShape(opts: {
  units: number;
  explicitPack: boolean;
  variantName: string;
  packagingUnitName?: string | null;
}): VariantSellShape {
  const isPack = opts.explicitPack || opts.units > 1;
  const shape: VariantSellShape = {
    packageVariant: isPack,
    packagingUnitQty: opts.units,
    packagingUnitName: opts.packagingUnitName?.trim() || opts.variantName,
    isStocked: false,
  };
  if (isPack) shape.isWeighed = false;
  return shape;
}

function countLabel(n: number, one: string, many: string): string {
  const shown = Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${shown} ${n === 1 ? one : many}`;
}

/**
 * Human-readable **in-store** (branch on-hand) for catalog rows and detail.
 * Uses `stockQty` / `baseStockQty` only — never falls back to business-wide
 * `currentStock` (overall), which would blend the two numbers.
 */
export function formatStockLabel(
  row:
    | {
        packageVariant?: boolean;
        stockQty?: number | string | null;
        baseStockQty?: number | string | null;
        packageUnitsPerSale?: number | string | null;
        packagingUnitQty?: number | string | null;
      }
    | null
    | undefined,
): string {
  if (!row) return "—";
  if (row.packageVariant) {
    const pkgs = toNumber(row.stockQty);
    const units = packageUnitsPerSaleFromRow(row);
    const base =
      toNumber(row.baseStockQty) ??
      (pkgs != null && units != null ? pkgs * units : null);
    // A one-unit "package" is a shared selling unit — report base units only.
    if (!isPackUnits(units)) {
      const each = base ?? pkgs;
      return each != null ? each.toLocaleString() : "—";
    }
    if (pkgs == null && base == null) return "—";
    const pkgPart =
      pkgs != null ? countLabel(pkgs, "pack", "packs") : "—";
    if (base != null) {
      return `${pkgPart} · ${countLabel(base, "unit", "units")}`;
    }
    return pkgPart;
  }
  const onHand = toNumber(row.stockQty);
  return onHand != null ? onHand.toLocaleString() : "—";
}

/** Business-wide overall stock (`items.currentStock`) — distinct from in-store. */
export function formatOverallStockLabel(
  row: { currentStock?: number | string | null } | null | undefined,
): string {
  const n = toNumber(row?.currentStock);
  return n != null ? n.toLocaleString() : "—";
}

/**
 * Branch on-hand in base units (packages → base for package variants).
 * Never uses overall `currentStock` as a stand-in for in-store qty.
 */
export function effectiveOnHand(
  detail:
    | {
        packageVariant?: boolean;
        stockQty?: number | string | null;
        baseStockQty?: number | string | null;
        packageUnitsPerSale?: number | string | null;
        packagingUnitQty?: number | string | null;
      }
    | null
    | undefined,
): number | null {
  if (!detail) return null;
  if (detail.packageVariant) {
    const base = toNumber(detail.baseStockQty);
    if (base != null) return base;
    const pkgs = toNumber(detail.stockQty);
    const units = packageUnitsPerSaleFromRow(detail);
    if (pkgs != null && units != null) return pkgs * units;
    return null;
  }
  return toNumber(detail.stockQty);
}

export type SellingUnitSource = {
  id: string;
  name?: string | null;
  variantName?: string | null;
  parentName?: string | null;
  packageVariant?: boolean;
  packageUnitsPerSale?: number | string | null;
  packagingUnitQty?: number | string | null;
  stockQty?: number | string | null;
  baseStockQty?: number | string | null;
};

/** Base units one sale of this SKU removes. Null when the row keeps its own stock. */
export function unitsPerSaleOf(
  row: Omit<SellingUnitSource, "id"> | null | undefined,
): number | null {
  if (!row) return null;
  const units = packageUnitsPerSaleFromRow(row);
  if (units != null && units > 0) return units;
  if (row.packageVariant) return 1;
  return null;
}

export type ShelfSellingUnit = {
  id: string;
  label: string;
  unitsPerSale: number;
};

function sellingUnitLabel(row: SellingUnitSource, baseName: string): string {
  const label = row.variantName?.trim() || row.name?.trim();
  if (label) return label;
  return unitsPerSaleOf(row) === 1 ? baseName : "Pack";
}

/**
 * Selling units that draw from one shelf. A family with only packs also gets
 * a 1-unit line so the loose eggs have somewhere to sit.
 */
export function shelfSellingUnits(
  sources: SellingUnitSource[],
  baseName: string,
): ShelfSellingUnit[] {
  const seen = new Set<string>();
  const units: ShelfSellingUnit[] = [];
  for (const row of sources) {
    const perSale = unitsPerSaleOf(row);
    if (perSale == null || seen.has(row.id)) continue;
    seen.add(row.id);
    units.push({
      id: row.id,
      label: sellingUnitLabel(row, baseName),
      unitsPerSale: perSale,
    });
  }
  if (units.length > 0 && !units.some((unit) => unit.unitsPerSale === 1)) {
    units.unshift({ id: "base", label: baseName, unitsPerSale: 1 });
  }
  units.sort(
    (a, b) => a.unitsPerSale - b.unitsPerSale || a.label.localeCompare(b.label),
  );
  return units;
}

/** True when the family sells at least one multi-unit pack from a shared shelf. */
export function familySellsPacks(sources: SellingUnitSource[]): boolean {
  return sources.some((row) => isPackUnits(unitsPerSaleOf(row)));
}

/** Variant rows when the family is loaded; otherwise the open pack itself. */
export function stockFamilySources(
  detail: SellingUnitSource,
  variantRows: SellingUnitSource[],
): SellingUnitSource[] {
  if (variantRows.length > 0) return variantRows;
  return unitsPerSaleOf(detail) != null ? [detail] : [];
}

export type OnHandSlice = ShelfSellingUnit & {
  count: number;
  baseUnits: number;
};

function roundShelfQty(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Split one on-hand count into whole packs, largest first.
 * Equal pack sizes share one count. Anything left is `loose` unless a
 * 1-unit line can hold it.
 */
export function allocateOnHand(
  baseUnits: number,
  units: ShelfSellingUnit[],
): { slices: OnHandSlice[]; loose: number } {
  const safe = Number.isFinite(baseUnits) && baseUnits > 0 ? baseUnits : 0;
  const sizes = [...new Set(units.map((unit) => unit.unitsPerSale))]
    .filter((size) => size > 0)
    .sort((a, b) => b - a);
  const countBySize = new Map<number, number>();
  let remaining = safe;
  for (const size of sizes) {
    if (size > 1) {
      const count = Math.floor(remaining / size + 1e-9);
      countBySize.set(size, count);
      remaining = roundShelfQty(remaining - count * size);
      continue;
    }
    countBySize.set(size, roundShelfQty(remaining));
    remaining = 0;
  }
  const slices = units.map((unit) => {
    const count = countBySize.get(unit.unitsPerSale) ?? 0;
    return {
      ...unit,
      count,
      baseUnits: roundShelfQty(count * unit.unitsPerSale),
    };
  });
  return { slices, loose: remaining };
}

/**
 * What one selling unit could sell from the whole shelf on its own: 158 eggs
 * are 158 singles, or 5 trays with 8 eggs left over. Every unit reads the
 * same count, so these overlap — they are not separate stocks.
 */
export function unitAvailabilityLabel(
  baseUnits: number,
  unit: ShelfSellingUnit,
): string {
  const safe = Number.isFinite(baseUnits) && baseUnits > 0 ? baseUnits : 0;
  if (!(unit.unitsPerSale > 1)) return formatShelfQty(roundShelfQty(safe));
  const whole = Math.floor(safe / unit.unitsPerSale + 1e-9);
  const rest = roundShelfQty(safe - whole * unit.unitsPerSale);
  return rest > 0.0001
    ? `${formatShelfQty(whole)}, ${formatShelfQty(rest)} rem`
    : formatShelfQty(whole);
}

/**
 * Stock is counted and costed in base units. A pack's cost (430 a tray) is
 * for the whole pack, so one base unit costs that divided by the pack size.
 */
export function baseUnitCost(
  cost: number | null | undefined,
  unitsPerSale: number | null | undefined,
): number | null {
  if (cost == null || !Number.isFinite(cost)) return null;
  if (unitsPerSale == null || !(unitsPerSale > 1)) return cost;
  return Math.round((cost / unitsPerSale) * 10000) / 10000;
}

export function saleTakesLabel(
  units: number,
  source?: string | null,
): string {
  const name = source?.trim() || "the product";
  const shown = Number.isInteger(units)
    ? units.toLocaleString()
    : units.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `1 sale takes ${shown} ${name}`;
}

export function onHandBreakdownLabel(
  slices: OnHandSlice[],
  loose: number,
  baseName: string,
): string {
  const ordered = [...slices].sort((a, b) => b.unitsPerSale - a.unitsPerSale);
  const parts = ordered.map(
    (slice) => `${formatShelfQty(slice.count)} ${slice.label}`,
  );
  if (loose > 0.0001) {
    parts.push(`${formatShelfQty(loose)} ${baseName} left over`);
  }
  return parts.join(", ");
}

function formatShelfQty(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export type CatalogQtyPresentation = {
  label: string;
  title: string;
  /** Visible "of 168" under a pack count, so it is not a second stock. */
  note: string | null;
};

/** Price-cleanup Qty cell: packs show whole packs and which base count they come from. */
export function catalogQtyPresentation(
  row: SellingUnitSource,
): CatalogQtyPresentation {
  const units = unitsPerSaleOf(row);
  if (units != null && isPackUnits(units)) {
    return packQtyPresentation(row, units);
  }
  if (units === 1) return eachQtyPresentation(row);
  const onHand = toNumber(row.stockQty);
  return {
    label: onHand != null ? formatShelfQty(onHand) : "—",
    title: formatStockLabel(row),
    note: null,
  };
}

function eachQtyPresentation(row: SellingUnitSource): CatalogQtyPresentation {
  const base = toNumber(row.baseStockQty) ?? toNumber(row.stockQty);
  const source = row.parentName?.trim() || row.name?.trim() || "the shelf";
  if (base == null) {
    return { label: "—", title: saleTakesLabel(1, source), note: null };
  }
  const shown = formatShelfQty(base);
  return {
    label: shown,
    title: `${shown} ${source}. ${saleTakesLabel(1, source)}`,
    note: null,
  };
}

function packQtyPresentation(
  row: SellingUnitSource,
  units: number,
): CatalogQtyPresentation {
  const base = toNumber(row.baseStockQty);
  const whole =
    toNumber(row.stockQty) ??
    (base != null ? Math.floor(base / units) : null);
  const source = row.parentName?.trim() || "the shelf";
  const takes = saleTakesLabel(units, source);
  if (whole == null) {
    return { label: "—", title: takes, note: null };
  }
  const packs = countLabel(whole, "pack", "packs");
  const held = roundShelfQty(whole * units);
  if (base == null) {
    return { label: formatShelfQty(whole), title: `${packs}. ${takes}`, note: null };
  }
  const ofBase =
    Math.abs(base - held) > 0.0001
      ? `${formatShelfQty(held)} of ${formatShelfQty(base)} ${source}`
      : `${formatShelfQty(base)} ${source}`;
  return {
    label: formatShelfQty(whole),
    title: `${packs} · ${ofBase}. ${takes}`,
    note: `of ${formatShelfQty(base)}`,
  };
}

export function formatAmount(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function optionalPositiveNumber(
  raw: string,
  label: string,
): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`${label} must be a valid number.`);
  return n;
}

// ─── image helpers ────────────────────────────────────────────────────────────

export function galleryImageUrl(img: ItemImageRecord): string | null {
  const secure = img.secureUrl?.trim();
  if (secure) return secure;
  const key = img.s3Key?.trim();
  if (key?.startsWith("http")) return key;
  return null;
}

export function coverImageUrl(detail: ItemDetailRecord): string | null {
  const k = detail.imageKey?.trim();
  if (k?.startsWith("http")) return k;
  const sorted = detail.images
    ? [...detail.images].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  for (const img of sorted) {
    const u = galleryImageUrl(img);
    if (u) return u;
  }
  return null;
}

// ─── variant payload builders ─────────────────────────────────────────────────

export function buildCreatePackageVariantBody(
  draft: PackageDraft,
): CreateVariantPayload {
  const name = draft.name.trim();
  if (!name) throw new Error("Package name is required.");
  const units = Number(draft.unitsPerPackage.trim());
  if (!Number.isFinite(units) || units <= 0 || !Number.isInteger(units)) {
    throw new Error("Units per package must be a positive whole number.");
  }
  const body: CreateVariantPayload = {
    variantName: name,
    packageVariant: true,
    packagingUnitName: name,
    packagingUnitQty: units,
    bundleQty: 1,
    isWeighed: false,
  };
  if (draft.sku.trim()) body.sku = draft.sku.trim();
  if (draft.barcode.trim()) body.barcode = draft.barcode.trim();
  if (draft.price.trim()) {
    const price = Number(draft.price.trim());
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Package price must be a valid non-negative number.");
    }
    body.bundlePrice = price;
  }
  return body;
}

export function buildCreateVariantBody(
  draft: VariantDraft,
): CreateVariantPayload {
  const variantName = draft.variantName.trim();
  if (!variantName) throw new Error("Variant label is required.");

  if (draft.isPackageVariant) {
    const units = Number(draft.unitsPerPackage.trim());
    if (!Number.isFinite(units) || units <= 0 || !Number.isInteger(units)) {
      throw new Error("Units per package must be a positive whole number.");
    }
    const body: CreateVariantPayload = {
      variantName,
      packageVariant: true,
      packagingUnitName: variantName,
      packagingUnitQty: units,
      bundleQty: 1,
      isWeighed: false,
    };
    if (draft.sku.trim()) body.sku = draft.sku.trim();
    if (draft.barcode.trim()) body.barcode = draft.barcode.trim();
    if (draft.bundlePrice.trim()) {
      const price = Number(draft.bundlePrice.trim());
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Package price must be a valid non-negative number.");
      }
      body.bundlePrice = price;
    }
    return body;
  }

  const body: CreateVariantPayload = { variantName };
  if (draft.sku.trim()) body.sku = draft.sku.trim();
  if (draft.name.trim()) body.name = draft.name.trim();
  if (draft.barcode.trim()) body.barcode = draft.barcode.trim();
  if (draft.description.trim()) body.description = draft.description.trim();
  if (draft.categoryId.trim()) body.categoryId = draft.categoryId.trim();
  if (draft.brand.trim()) body.brand = draft.brand.trim();
  if (draft.size.trim()) body.size = draft.size.trim();
  if (draft.unitType.trim()) body.unitType = draft.unitType.trim();
  if (draft.imageKey.trim()) body.imageKey = draft.imageKey.trim();

  const minL = optionalPositiveNumber(draft.minStockLevel, "Min stock level");
  if (minL !== undefined) body.minStockLevel = minL;
  const rL = optionalPositiveNumber(draft.reorderLevel, "Reorder level");
  if (rL !== undefined) body.reorderLevel = rL;
  const rQ = optionalPositiveNumber(draft.reorderQty, "Reorder qty");
  if (rQ !== undefined) body.reorderQty = rQ;

  return body;
}

export function bundlePatchFromVariantDraft(
  draft: VariantDraft,
): PatchItemPayload | null {
  const patch: PatchItemPayload = {};

  if (draft.bundleQty.trim()) {
    const n = Number(draft.bundleQty.trim());
    if (!Number.isFinite(n))
      throw new Error("Bundle qty must be a valid number.");
    patch.bundleQty = n;
  }
  if (draft.bundlePrice.trim()) {
    const n = Number(draft.bundlePrice.trim());
    if (!Number.isFinite(n))
      throw new Error("Bundle price must be a valid number.");
    patch.bundlePrice = n;
  }
  // Variant form "Buy price" is draft.defaultCostPrice; Commerce COST reads item.buyingPrice
  // (and supplier default when linked). Persist buy price even without a supplier.
  if (draft.defaultCostPrice.trim()) {
    const n = Number(draft.defaultCostPrice.trim());
    if (!Number.isFinite(n) || n < 0) {
      throw new Error("Buy price must be a valid non-negative number.");
    }
    patch.buyingPrice = n;
  }
  if (draft.bundleName.trim()) patch.bundleName = draft.bundleName.trim();

  return Object.keys(patch).length > 0 ? patch : null;
}
