/** A4 price-tag printing. Layout only — prices always come from a fresh catalog read. */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export type TagTemplateId = "classic" | "promo" | "barcode" | "premium";

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
  border: TagBorder;
  align: TagAlign;
  fields: TagField[];
  /** Shared line such as "Fresh deal". Not a price. */
  promoMessage: string;
  /** Draw a Code 128 from the SKU when the product has no barcode. */
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
};

export type TagInstance = {
  key: string;
  itemId: string;
};

export type SavedTagLayout = {
  id: string;
  name: string;
  layout: TagLayout;
};

export type PriceTagPreferences = {
  layout: TagLayout;
  saved: SavedTagLayout[];
};
