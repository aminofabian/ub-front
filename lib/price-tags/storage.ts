import { DEFAULT_LAYOUT } from "@/lib/price-tags/templates";
import type {
  PriceTagPreferences,
  SavedTagLayout,
  TagField,
  TagLayout,
} from "@/lib/price-tags/types";

const FIELD_SET = new Set<TagField>([
  "businessName",
  "productName",
  "sellingPrice",
  "previousPrice",
  "discountPercent",
  "sku",
  "barcode",
  "unit",
  "promoMessage",
  "category",
]);

function storageKey(businessId: string): string {
  return `kiosk.price-tags.v1.${businessId}`;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sanitizeLayout(raw: unknown): TagLayout {
  const base = DEFAULT_LAYOUT;
  if (!raw || typeof raw !== "object") return { ...base, fields: base.fields.slice() };
  const row = raw as Partial<TagLayout>;
  const fields = Array.isArray(row.fields)
    ? row.fields.filter((field): field is TagField => FIELD_SET.has(field as TagField))
    : base.fields.slice();
  return {
    presetId: row.presetId ?? "custom",
    templateId: row.templateId ?? base.templateId,
    tagWidthMm: num(row.tagWidthMm, base.tagWidthMm),
    tagHeightMm: num(row.tagHeightMm, base.tagHeightMm),
    gapXMm: num(row.gapXMm, base.gapXMm),
    gapYMm: num(row.gapYMm, base.gapYMm),
    marginTopMm: num(row.marginTopMm, base.marginTopMm),
    marginRightMm: num(row.marginRightMm, base.marginRightMm),
    marginBottomMm: num(row.marginBottomMm, base.marginBottomMm),
    marginLeftMm: num(row.marginLeftMm, base.marginLeftMm),
    orientation: row.orientation === "vertical" ? "vertical" : "horizontal",
    border:
      row.border === "none" ||
      row.border === "solid" ||
      row.border === "dashed" ||
      row.border === "ticket"
        ? row.border
        : "hairline",
    align: row.align === "center" ? "center" : "left",
    fields: fields.length > 0 ? fields : base.fields.slice(),
    promoMessage: typeof row.promoMessage === "string" ? row.promoMessage.slice(0, 40) : "",
    generateBarcodeFromSku: row.generateBarcodeFromSku !== false,
  };
}

export function readPriceTagPreferences(businessId: string): PriceTagPreferences {
  const fallback: PriceTagPreferences = {
    layout: { ...DEFAULT_LAYOUT, fields: DEFAULT_LAYOUT.fields.slice() },
    saved: [],
  };
  if (!businessId || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(businessId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { layout?: unknown; saved?: unknown };
    const saved = Array.isArray(parsed.saved)
      ? parsed.saved
          .map((entry) => sanitizeSaved(entry))
          .filter((entry): entry is SavedTagLayout => entry != null)
          .slice(0, 24)
      : [];
    return { layout: sanitizeLayout(parsed.layout), saved };
  } catch {
    return fallback;
  }
}

export function writePriceTagPreferences(
  businessId: string,
  preferences: PriceTagPreferences,
): void {
  if (!businessId || typeof window === "undefined") return;
  const payload = {
    layout: preferences.layout,
    saved: preferences.saved.slice(0, 24).map((entry) => ({
      id: entry.id,
      name: entry.name.slice(0, 48),
      layout: entry.layout,
    })),
  };
  window.localStorage.setItem(storageKey(businessId), JSON.stringify(payload));
}

function sanitizeSaved(raw: unknown): SavedTagLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { id?: unknown; name?: unknown; layout?: unknown };
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  const name = row.name.trim();
  if (!name) return null;
  return { id: row.id, name: name.slice(0, 48), layout: sanitizeLayout(row.layout) };
}
