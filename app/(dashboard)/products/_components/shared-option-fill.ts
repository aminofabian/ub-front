import type {
  GlobalProductFamilyRecord,
  GlobalProductRecord,
} from "@/lib/api";

import type { GroupOptionRow } from "./CreateGroupOptionsPad";

/**
 * Pure helpers that turn a shared-catalog product into an option row for
 * "Family + options". Kept free of React so they can be unit-tested.
 */

type SharedNameFields = Pick<
  GlobalProductRecord,
  "name" | "variantName" | "size" | "packagingUnitName" | "packagingUnitQty"
>;

const LEADING_GLUE = /^[\s·•\-–—,:/]+/;

function tidy(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ");
}

function startsWithFamily(text: string, family: string): boolean {
  return text.toLowerCase().startsWith(family.toLowerCase());
}

function dropFamily(text: string, family: string): string {
  return text.slice(family.length).replace(LEADING_GLUE, "").trim();
}

/** "Tray ×30", "500ml" — the part of a shared product that tells it apart from its siblings. */
function distinguishingDetail(g: SharedNameFields, family: string): string {
  const variant = tidy(g.variantName);
  if (variant) {
    return family && startsWithFamily(variant, family)
      ? dropFamily(variant, family) || variant
      : variant;
  }
  const unit = tidy(g.packagingUnitName);
  if (unit) {
    const qty = g.packagingUnitQty;
    return qty != null && Number.isFinite(qty) && qty > 0
      ? `${unit} ×${qty}`
      : unit;
  }
  return tidy(g.size);
}

/**
 * The option label (the part typed after the family name) for a shared product.
 *
 * - No family name yet → the whole product name, so nothing is lost.
 * - "Fresh Milk 500ml" under family "Fresh Milk" → "500ml".
 * - A member of the family whose name does not repeat it → its variant name, pack
 *   unit or size, then `fallback`.
 * - A product that merely shares a barcode with the row (not known to belong to the
 *   family) keeps its full name, so "Coca-Cola 500ml" never shrinks to "500ml".
 */
export function optionSuffixFromShared(
  familyName: string,
  g: SharedNameFields,
  opts?: { inFamily?: boolean; fallback?: string },
): string {
  const family = tidy(familyName);
  const name = tidy(g.name);
  const fallback = opts?.fallback ?? "";
  if (!family) return name || fallback;
  if (name && startsWithFamily(name, family) && name.length > family.length) {
    const rest = dropFamily(name, family);
    if (rest) return rest;
  }
  const detail = distinguishingDetail(g, family);
  if (name.toLowerCase() === family.toLowerCase()) return detail || fallback;
  if (opts?.inFamily) return detail || name || fallback;
  return name || detail || fallback;
}

function moneyText(value: number | null | undefined): string {
  return value != null && Number.isFinite(value) && value > 0
    ? String(value)
    : "";
}

/** Option-row fields a shared product can fill: label, barcode and the recommended prices. */
export function sharedProductToOptionSeed(
  g: GlobalProductRecord,
  familyName: string,
  opts?: { inFamily?: boolean; fallback?: string },
): Partial<GroupOptionRow> {
  return {
    label: optionSuffixFromShared(familyName, g, opts),
    barcode: tidy(g.barcode),
    unitPrice: moneyText(g.recommendedSellingPrice),
    buyingPrice: moneyText(g.recommendedBuyingPrice),
    sharedProductId: g.id,
  };
}

/**
 * Applies a seed to a row without overwriting anything the clerk already typed.
 * The marker `sharedProductId` is always recorded.
 */
export function fillEmptyOptionFields(
  row: GroupOptionRow,
  seed: Partial<GroupOptionRow>,
): GroupOptionRow {
  return {
    ...row,
    label: row.label.trim() ? row.label : (seed.label ?? row.label),
    barcode: row.barcode.trim() ? row.barcode : (seed.barcode ?? row.barcode),
    unitPrice: row.unitPrice.trim()
      ? row.unitPrice
      : (seed.unitPrice ?? row.unitPrice),
    buyingPrice: row.buyingPrice.trim()
      ? row.buyingPrice
      : (seed.buyingPrice ?? row.buyingPrice),
    sharedProductId: seed.sharedProductId ?? row.sharedProductId ?? null,
  };
}

export type FamilyFillPlan = {
  /** The match has pack sizes / siblings, so the family takes the base product's name. */
  isFamily: boolean;
  /** Name for the family: the base product's, or what the clerk typed for a lone product. */
  familyTitle: string;
  root: GlobalProductRecord;
  /** Options to add, in order, with the row fields each one fills. */
  picks: Array<{ g: GlobalProductRecord; seed: Partial<GroupOptionRow> }>;
  /** Members left out because they are already on the shelf. */
  onShelf: number;
  /** Members left out because the family would pass the option limit. */
  trimmed: number;
};

/**
 * Decides what picking a shared-catalog product in Family + options adds: a base
 * product with pack sizes becomes one option per member (the base itself first when
 * it is sellable); a lone product becomes a single option under the typed family
 * name. Members already on the shelf are skipped.
 */
export function planFamilyFill(args: {
  match: GlobalProductRecord;
  family: GlobalProductFamilyRecord | null;
  typedName: string;
  /** How many more options fit in the form. */
  room: number;
}): FamilyFillPlan {
  const { match, family } = args;
  const root = family?.root ?? match;
  const variants = (family?.variants ?? []).filter((v) => v.id !== root.id);
  const isFamily = variants.length > 0;
  const pool = isFamily
    ? root.sellable
      ? [root, ...variants]
      : variants
    : [root];
  const fresh = pool.filter((g) => !g.alreadyImported);
  const familyTitle = isFamily ? root.name : tidy(args.typedName) || root.name;
  const picks = fresh.slice(0, Math.max(0, args.room)).map((g) => ({
    g,
    seed: sharedProductToOptionSeed(
      g,
      familyTitle,
      isFamily
        ? { inFamily: true, fallback: g.id === root.id ? "Single" : "" }
        : undefined,
    ),
  }));
  return {
    isFamily,
    familyTitle,
    root,
    picks,
    onShelf: pool.length - fresh.length,
    trimmed: fresh.length - picks.length,
  };
}

const IMAGE_FETCH_TIMEOUT_MS = 6000;
const IMAGE_MAX_BYTES = 6 * 1024 * 1024;

/**
 * Best-effort download of a catalog photo so it can be saved as the item's own
 * photo. Returns null on any failure (offline, CORS, too large, not an image) —
 * the option is then simply created without a photo.
 */
export async function fetchImageAsFile(
  url: string,
  nameHint = "photo",
): Promise<File | null> {
  const href = url.trim();
  if (!href || typeof fetch !== "function") return null;
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
    : null;
  try {
    const res = await fetch(href, {
      mode: "cors",
      credentials: "omit",
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    if (blob.size === 0 || blob.size > IMAGE_MAX_BYTES) return null;
    const ext = blob.type.split("/")[1]?.split("+")[0] || "jpg";
    const base =
      nameHint
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "photo";
    return new File([blob], `${base}.${ext}`, { type: blob.type });
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
