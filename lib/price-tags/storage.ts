import { clamp } from "@/lib/price-tags/layout";
import { ALL_TAG_FIELDS, DEFAULT_LAYOUT, LABEL_PRESETS, TEMPLATE_FIELDS } from "@/lib/price-tags/templates";
import type {
  LabelPresetId,
  PageDirection,
  PrinterCalibration,
  PriceTagPreferences,
  SavedTagLayout,
  SheetCount,
  StoredTagQueue,
  TagBorder,
  TagField,
  TagLayout,
  TagTemplateId,
} from "@/lib/price-tags/types";

const FIELD_SET = new Set<TagField>(ALL_TAG_FIELDS);
const BORDERS = new Set<TagBorder>(["none", "hairline", "solid", "dashed", "ticket"]);
const MAX_SAVED = 24;
/** Big enough for a full store relabel; bounded so localStorage stays small. */
export const MAX_QUEUED_TAGS = 2000;
export const CALIBRATION_LIMIT_MM = 10;

export const NO_CALIBRATION: PrinterCalibration = { offsetXMm: 0, offsetYMm: 0 };

function storageKey(businessId: string): string {
  return `kiosk.price-tags.v1.${businessId}`;
}

function queueKey(businessId: string): string {
  return `kiosk.price-tags.queue.v1.${businessId}`;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isTemplate(value: unknown): value is TagTemplateId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TEMPLATE_FIELDS, value);
}

function isSheetCount(value: unknown): value is SheetCount {
  return value === 24 || value === 48 || value === 72 || value === 96;
}

function isPageDirection(value: unknown): value is PageDirection {
  return value === "portrait" || value === "landscape";
}

function isPreset(value: unknown): value is LabelPresetId {
  return (
    value === "custom" ||
    (typeof value === "string" && Object.prototype.hasOwnProperty.call(LABEL_PRESETS, value))
  );
}

export function sanitizeLayout(raw: unknown): TagLayout {
  const base = DEFAULT_LAYOUT;
  if (!raw || typeof raw !== "object") return { ...base, fields: base.fields.slice() };
  const row = raw as Partial<Record<keyof TagLayout, unknown>>;
  const fields = Array.isArray(row.fields)
    ? row.fields.filter((field): field is TagField => FIELD_SET.has(field as TagField))
    : base.fields.slice();
  return {
    presetId: isPreset(row.presetId) ? row.presetId : "custom",
    templateId: isTemplate(row.templateId) ? row.templateId : base.templateId,
    tagWidthMm: num(row.tagWidthMm, base.tagWidthMm),
    tagHeightMm: num(row.tagHeightMm, base.tagHeightMm),
    gapXMm: num(row.gapXMm, base.gapXMm),
    gapYMm: num(row.gapYMm, base.gapYMm),
    marginTopMm: num(row.marginTopMm, base.marginTopMm),
    marginRightMm: num(row.marginRightMm, base.marginRightMm),
    marginBottomMm: num(row.marginBottomMm, base.marginBottomMm),
    marginLeftMm: num(row.marginLeftMm, base.marginLeftMm),
    orientation: row.orientation === "vertical" ? "vertical" : "horizontal",
    pageDirection: isPageDirection(row.pageDirection) ? row.pageDirection : "portrait",
    sheetCount: isSheetCount(row.sheetCount) ? row.sheetCount : null,
    border: BORDERS.has(row.border as TagBorder) ? (row.border as TagBorder) : "hairline",
    align: row.align === "center" ? "center" : "left",
    fields: fields.length > 0 ? Array.from(new Set(fields)) : base.fields.slice(),
    promoMessage: typeof row.promoMessage === "string" ? row.promoMessage.slice(0, 40) : "",
    generateBarcodeFromSku: row.generateBarcodeFromSku !== false,
  };
}

export function sanitizeCalibration(raw: unknown): PrinterCalibration {
  if (!raw || typeof raw !== "object") return { ...NO_CALIBRATION };
  const row = raw as { offsetXMm?: unknown; offsetYMm?: unknown };
  const limit = CALIBRATION_LIMIT_MM;
  return {
    offsetXMm: clamp(num(row.offsetXMm, 0), -limit, limit),
    offsetYMm: clamp(num(row.offsetYMm, 0), -limit, limit),
  };
}

export function readPriceTagPreferences(businessId: string): PriceTagPreferences {
  const fallback: PriceTagPreferences = {
    layout: { ...DEFAULT_LAYOUT, fields: DEFAULT_LAYOUT.fields.slice() },
    saved: [],
    calibration: { ...NO_CALIBRATION },
  };
  if (!businessId || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(businessId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { layout?: unknown; saved?: unknown; calibration?: unknown };
    const saved = Array.isArray(parsed.saved)
      ? parsed.saved
          .map((entry) => sanitizeSaved(entry))
          .filter((entry): entry is SavedTagLayout => entry != null)
          .slice(0, MAX_SAVED)
      : [];
    return {
      layout: sanitizeLayout(parsed.layout),
      saved,
      calibration: sanitizeCalibration(parsed.calibration),
    };
  } catch {
    return fallback;
  }
}

/** Returns false when the browser refused the write (private mode, quota). */
export function writePriceTagPreferences(
  businessId: string,
  preferences: PriceTagPreferences,
): boolean {
  if (!businessId || typeof window === "undefined") return false;
  const payload = {
    layout: preferences.layout,
    saved: preferences.saved.slice(0, MAX_SAVED).map((entry) => ({
      id: entry.id,
      name: entry.name.slice(0, 48),
      layout: entry.layout,
    })),
    calibration: preferences.calibration,
  };
  return safeWrite(storageKey(businessId), JSON.stringify(payload));
}

export function sanitizeQueue(raw: unknown): StoredTagQueue {
  const empty: StoredTagQueue = { itemIds: [], wasOverrides: {} };
  if (!raw || typeof raw !== "object") return empty;
  const row = raw as { itemIds?: unknown; wasOverrides?: unknown };
  const itemIds = Array.isArray(row.itemIds)
    ? row.itemIds
        .filter((id): id is string => typeof id === "string" && id.trim() !== "")
        .slice(0, MAX_QUEUED_TAGS)
    : [];
  const listed = new Set(itemIds);
  const wasOverrides: Record<string, number | null> = {};
  if (row.wasOverrides && typeof row.wasOverrides === "object") {
    for (const [id, value] of Object.entries(row.wasOverrides as Record<string, unknown>)) {
      if (!listed.has(id)) continue;
      if (value === null) wasOverrides[id] = null;
      else if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        wasOverrides[id] = value;
      }
    }
  }
  return { itemIds, wasOverrides };
}

export function readTagQueue(businessId: string): StoredTagQueue {
  if (!businessId || typeof window === "undefined") return sanitizeQueue(null);
  try {
    const raw = window.localStorage.getItem(queueKey(businessId));
    return sanitizeQueue(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeQueue(null);
  }
}

export function writeTagQueue(businessId: string, queue: StoredTagQueue): boolean {
  if (!businessId || typeof window === "undefined") return false;
  if (queue.itemIds.length === 0) {
    try {
      window.localStorage.removeItem(queueKey(businessId));
      return true;
    } catch {
      return false;
    }
  }
  return safeWrite(queueKey(businessId), JSON.stringify(sanitizeQueue(queue)));
}

function safeWrite(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function sanitizeSaved(raw: unknown): SavedTagLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { id?: unknown; name?: unknown; layout?: unknown };
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  const name = row.name.trim();
  if (!name) return null;
  return { id: row.id, name: name.slice(0, 48), layout: sanitizeLayout(row.layout) };
}
