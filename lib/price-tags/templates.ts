import type { LabelPresetId, TagField, TagLayout, TagTemplateId } from "@/lib/price-tags/types";

export const TEMPLATE_FIELDS: Record<TagTemplateId, TagField[]> = {
  classic: ["businessName", "productName", "sellingPrice", "barcode"],
  promo: [
    "businessName",
    "promoMessage",
    "productName",
    "sellingPrice",
    "previousPrice",
    "discountPercent",
    "sku",
  ],
  barcode: ["productName", "sellingPrice", "sku", "barcode"],
  premium: ["businessName", "productName", "sellingPrice", "unit", "category", "sku"],
};

export const TEMPLATE_COPY: Record<
  TagTemplateId,
  { label: string; detail: string }
> = {
  classic: {
    label: "Classic",
    detail: "Name, price, and barcode.",
  },
  promo: {
    label: "Promotional",
    detail: "Sale price beside the previous price.",
  },
  barcode: {
    label: "Barcode",
    detail: "Name, price, SKU, and a scannable code.",
  },
  premium: {
    label: "Premium",
    detail: "Quieter type, with room for the product name.",
  },
};

type PresetPatch = Pick<
  TagLayout,
  | "presetId"
  | "tagWidthMm"
  | "tagHeightMm"
  | "gapXMm"
  | "gapYMm"
  | "marginTopMm"
  | "marginRightMm"
  | "marginBottomMm"
  | "marginLeftMm"
>;

export const LABEL_PRESETS: Record<
  Exclude<LabelPresetId, "custom">,
  PresetPatch & { label: string; detail: string }
> = {
  "shelf-3x8": {
    presetId: "shelf-3x8",
    label: "Shelf 3 × 8",
    detail: "63 × 32 mm",
    tagWidthMm: 63,
    tagHeightMm: 32,
    gapXMm: 2.5,
    gapYMm: 2,
    marginTopMm: 12,
    marginRightMm: 8,
    marginBottomMm: 12,
    marginLeftMm: 8,
  },
  "wide-2x6": {
    presetId: "wide-2x6",
    label: "Wide 2 × 6",
    detail: "96 × 44 mm",
    tagWidthMm: 96,
    tagHeightMm: 44,
    gapXMm: 4,
    gapYMm: 3,
    marginTopMm: 8,
    marginRightMm: 7,
    marginBottomMm: 8,
    marginLeftMm: 7,
  },
  "large-2x4": {
    presetId: "large-2x4",
    label: "Large 2 × 4",
    detail: "96 × 66 mm",
    tagWidthMm: 96,
    tagHeightMm: 66,
    gapXMm: 4,
    gapYMm: 4,
    marginTopMm: 10,
    marginRightMm: 7,
    marginBottomMm: 10,
    marginLeftMm: 7,
  },
  "sticker-70x37": {
    presetId: "sticker-70x37",
    label: "Sticker 70 × 37",
    detail: "Two columns, die-cut size",
    tagWidthMm: 70,
    tagHeightMm: 37,
    gapXMm: 2,
    gapYMm: 2,
    marginTopMm: 8,
    marginRightMm: 6,
    marginBottomMm: 8,
    marginLeftMm: 6,
  },
};

export const DEFAULT_LAYOUT: TagLayout = {
  ...LABEL_PRESETS["shelf-3x8"],
  templateId: "classic",
  orientation: "horizontal",
  border: "hairline",
  align: "left",
  fields: TEMPLATE_FIELDS.classic.slice(),
  promoMessage: "",
  generateBarcodeFromSku: true,
};

export function applyTemplate(layout: TagLayout, templateId: TagTemplateId): TagLayout {
  return {
    ...layout,
    templateId,
    fields: TEMPLATE_FIELDS[templateId].slice(),
  };
}

export function applyPreset(
  layout: TagLayout,
  presetId: Exclude<LabelPresetId, "custom">,
): TagLayout {
  const preset = LABEL_PRESETS[presetId];
  return {
    ...layout,
    presetId: preset.presetId,
    tagWidthMm: preset.tagWidthMm,
    tagHeightMm: preset.tagHeightMm,
    gapXMm: preset.gapXMm,
    gapYMm: preset.gapYMm,
    marginTopMm: preset.marginTopMm,
    marginRightMm: preset.marginRightMm,
    marginBottomMm: preset.marginBottomMm,
    marginLeftMm: preset.marginLeftMm,
  };
}

const FIELD_LABELS: Record<TagField, string> = {
  businessName: "Business name",
  productName: "Product name",
  sellingPrice: "Selling price",
  previousPrice: "Previous price",
  discountPercent: "Discount",
  sku: "SKU",
  barcode: "Barcode",
  unit: "Unit",
  promoMessage: "Promotional line",
  category: "Category",
};

export function fieldLabel(field: TagField): string {
  return FIELD_LABELS[field];
}

export const ALL_TAG_FIELDS: TagField[] = [
  "businessName",
  "promoMessage",
  "productName",
  "sellingPrice",
  "previousPrice",
  "discountPercent",
  "unit",
  "category",
  "sku",
  "barcode",
];
