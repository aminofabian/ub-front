import { canEncodeBarcode, assessBarcodeCode } from "@/lib/barcode-label";
import { discountPercent, tagPriceLabel } from "@/lib/price-tags/money";
import type { TagLayout, TagProduct, TagTemplateId } from "@/lib/price-tags/types";

/**
 * What one tag face shows, in reading order. The print markup and the PDF
 * both draw from this list, so the two outputs cannot disagree on content.
 */
export type FaceBlock =
  | { kind: "shop" | "deal" | "name" | "was" | "off" | "meta" | "sku"; text: string }
  | { kind: "price"; text: string; per: string; missing: boolean }
  | { kind: "barcode"; code: string };

export type FaceBlockKind = FaceBlock["kind"];

/**
 * Base type sizes in millimetres on the 63 × 32 mm shelf tag. Both outputs
 * multiply them by `tagTypeScale`.
 */
export const TAG_TYPE_MM = {
  shop: 2.4,
  deal: 2.5,
  name: 3.3,
  premiumName: 3.8,
  price: 5.6,
  promoPrice: 6.2,
  premiumPrice: 6,
  missingPrice: 3.2,
  was: 2.8,
  off: 2.6,
  meta: 2.3,
  barcodeHeight: 8.5,
} as const;

/** Text size for a block on the given template, before scaling. */
export function blockSizeMm(kind: FaceBlockKind, template: TagTemplateId, missing = false): number {
  switch (kind) {
    case "shop":
      return TAG_TYPE_MM.shop;
    case "deal":
      return TAG_TYPE_MM.deal;
    case "name":
      return template === "premium" ? TAG_TYPE_MM.premiumName : TAG_TYPE_MM.name;
    case "price":
      if (missing) return TAG_TYPE_MM.missingPrice;
      if (template === "promo") return TAG_TYPE_MM.promoPrice;
      if (template === "premium") return TAG_TYPE_MM.premiumPrice;
      return TAG_TYPE_MM.price;
    case "was":
      return TAG_TYPE_MM.was;
    case "off":
      return TAG_TYPE_MM.off;
    case "barcode":
      return TAG_TYPE_MM.barcodeHeight;
    default:
      return TAG_TYPE_MM.meta;
  }
}

/**
 * When a face is too full, blocks are dropped in this order. The name and the
 * price are never dropped: a tag without them is wrong, not just crowded.
 */
export const DROP_ORDER: readonly FaceBlockKind[] = [
  "meta",
  "sku",
  "shop",
  "deal",
  "off",
  "was",
  "barcode",
];

export function barcodeValueFor(product: TagProduct, layout: TagLayout): string {
  const own = product.barcode.trim();
  if (own) {
    const assessed = assessBarcodeCode(own);
    return canEncodeBarcode(assessed.state) ? assessed.code : "";
  }
  if (!layout.generateBarcodeFromSku) return "";
  const assessed = assessBarcodeCode(product.sku);
  return canEncodeBarcode(assessed.state) ? assessed.code : "";
}

export function resolvedWasPrice(
  product: TagProduct,
  overrides: Readonly<Record<string, number | null>>,
): number | null {
  if (Object.prototype.hasOwnProperty.call(overrides, product.id)) {
    return overrides[product.id];
  }
  return product.catalogWasPrice;
}

export type FaceInput = {
  layout: TagLayout;
  businessName: string;
  currency: string | null | undefined;
  wasOverrides: Readonly<Record<string, number | null>>;
};

export function buildFaceBlocks(product: TagProduct, input: FaceInput): FaceBlock[] {
  const { layout, currency } = input;
  const fields = new Set(layout.fields);
  const was = resolvedWasPrice(product, input.wasOverrides);
  const off = discountPercent(product.sellingPrice, was);
  const promo = layout.promoMessage.trim();
  const blocks: FaceBlock[] = [];

  if (fields.has("businessName") && input.businessName) {
    blocks.push({ kind: "shop", text: input.businessName });
  }
  if (fields.has("promoMessage") && promo) blocks.push({ kind: "deal", text: promo });
  if (fields.has("productName")) blocks.push({ kind: "name", text: product.name });
  if (fields.has("sellingPrice")) {
    const missing = product.sellingPrice == null;
    blocks.push({
      kind: "price",
      text: tagPriceLabel(product.sellingPrice, currency),
      per: missing ? "" : product.pricePer,
      missing,
    });
  }
  // A previous price at or below today's (a typo, or "0") would mislead the shopper.
  const selling = product.sellingPrice;
  if (fields.has("previousPrice") && was != null && selling != null && was > selling) {
    blocks.push({ kind: "was", text: tagPriceLabel(was, currency) });
  }
  if (fields.has("discountPercent") && off != null) {
    blocks.push({ kind: "off", text: `${off}% off` });
  }
  // The unit already follows a weighed item's price; do not print it twice.
  const unitShownWithPrice = fields.has("sellingPrice") && product.pricePer !== "";
  if (fields.has("unit") && product.unitType && !unitShownWithPrice) {
    blocks.push({ kind: "meta", text: product.unitType });
  }
  if (fields.has("category") && product.categoryName) {
    blocks.push({ kind: "meta", text: product.categoryName });
  }
  if (fields.has("sku") && product.sku) blocks.push({ kind: "sku", text: `SKU ${product.sku}` });
  if (fields.has("barcode")) {
    const code = barcodeValueFor(product, layout);
    if (code) blocks.push({ kind: "barcode", code });
  }
  return blocks;
}
