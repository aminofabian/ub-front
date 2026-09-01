import type { SupplierItemLinkRecord } from "@/lib/api";

/** Split supplier link title so UIs can clamp the family name while keeping variant visible. */
export function orderLinkTitleParts(link: SupplierItemLinkRecord): {
  primary: string;
  option: string | null;
} {
  const parent = link.parentItemName?.trim();
  const variant = link.variantName?.trim();
  if (parent && variant) {
    return { primary: parent, option: variant };
  }
  if (parent) {
    return { primary: parent, option: null };
  }

  const name = link.itemName?.trim() || link.sku?.trim() || "Product";
  const sep = name.indexOf(" · ");
  if (sep > 0) {
    return {
      primary: name.slice(0, sep).trim(),
      option: name.slice(sep + 3).trim() || null,
    };
  }
  return { primary: name, option: variant || null };
}

/** Split a plain display name (e.g. from PO line meta). */
export function orderNameTitleParts(name: string): {
  primary: string;
  option: string | null;
} {
  const trimmed = name.trim() || "Product";
  const sep = trimmed.indexOf(" · ");
  if (sep > 0) {
    return {
      primary: trimmed.slice(0, sep).trim(),
      option: trimmed.slice(sep + 3).trim() || null,
    };
  }
  return { primary: trimmed, option: null };
}
