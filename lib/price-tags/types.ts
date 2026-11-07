/** A4 price-tag printing. Layout only — prices always come from a fresh catalog read. */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export type TagTemplateId = "classic" | "promo" | "barcode" | "premium" | "sticker" | "shelf";

export type TagField =
  | "businessName"
  | "productName"
  | "sellingPrice"
  | "previousPrice"
  | "discountPercent"
  | "sku"
  | "barcode"
  | "unit"
  | "promoMessage"
  | "category";

export type TagOrientation = "horizontal" | "vertical";
/** Which way the A4 sheet goes through the printer. */
export type PageDirection = "portrait" | "landscape";
/** Tags that fill one A4 sheet. */
export type SheetCount = 24 | 48 | 72 | 96;
/**
 * What the tags print on: an A4 sheet in an office printer, or a roll of
 * die-cut labels in a thermal label printer (one tag per label).
 */
export type TagMedia = "a4-sheet" | "label-roll";
export type TagBorder = "none" | "hairline" | "solid" | "dashed" | "ticket";
export type TagAlign = "left" | "center";

export type LabelPresetId =
  | "shelf-3x8"
  | "wide-2x6"
  | "large-2x4"
  | "sticker-70x37"
  | "custom";

/** Everything a shop can reuse. Never includes product ids or prices. */
export type TagLayout = {
  presetId: LabelPresetId;
  templateId: TagTemplateId;
  tagWidthMm: number;
  tagHeightMm: number;
  gapXMm: number;
  gapYMm: number;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  orientation: TagOrientation;
  /** Portrait is 210 × 297 mm. Landscape is 297 × 210 mm. */
  pageDirection: PageDirection;
  media: TagMedia;
  /** One label on the roll. Kept apart from the A4 tag size so switching back loses nothing. */
  rollWidthMm: number;
  rollHeightMm: number;
  /** Labels side by side on the roll (1 for a single row, 2 for "2 across"). */
  rollAcross: number;
  /** Backing showing between labels in the same row. */
  rollGapMm: number;
  /** Backing outside the outer labels, each side. */
  rollEdgeMm: number;
  /** Backing between rows down the roll; the gap sensor stops on it. */
  rollRowGapMm: number;
  /**
   * 24, 48, 72, or 96 when the sheet was set from those choices.
   * Null once the tag size has been edited by hand.
   */
  sheetCount: SheetCount | null;
  border: TagBorder;
  align: TagAlign;
  fields: TagField[];
  /** Shared line such as "Fresh deal". Not a price. */
  promoMessage: string;
  /**
   * Older layouts could draw a code from the SKU. Printed tags use the product
   * barcode only; the flag is kept so those layouts still load.
   */
  generateBarcodeFromSku: boolean;
};

export type SheetGeometry = {
  columns: number;
  rows: number;
  perPage: number;
  tagWidthMm: number;
  tagHeightMm: number;
  gapXMm: number;
  gapYMm: number;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  usedWidthMm: number;
  usedHeightMm: number;
  usableWidthMm: number;
  usableHeightMm: number;
  pageWidthMm: number;
  pageHeightMm: number;
};

export type TagProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  categoryName: string;
  unitType: string;
  sellingPrice: number | null;
  /** Catalog price when it is higher than the current selling price. */
  catalogWasPrice: number | null;
  /** Unit the price is quoted per ("kg") for weighed items; empty otherwise. */
  pricePer: string;
};

export type TagInstance = {
  key: string;
  itemId: string;
};

/** One position on a sheet: a tag, or a deliberately blank label. */
export type SheetCell = TagInstance | null;

/**
 * Printer-specific nudge applied to printed and PDF output only.
 * Positive X moves tags right, positive Y moves them down.
 */
export type PrinterCalibration = {
  offsetXMm: number;
  offsetYMm: number;
};

/** The current print job, kept across reloads. Holds item ids, never prices. */
export type StoredTagQueue = {
  itemIds: string[];
  wasOverrides: Record<string, number | null>;
};

export type SavedTagLayout = {
  id: string;
  name: string;
  layout: TagLayout;
};

export type PriceTagPreferences = {
  layout: TagLayout;
  saved: SavedTagLayout[];
  calibration: PrinterCalibration;
};
