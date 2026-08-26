import type { PublicCatalogItemCard } from "@/lib/public-storefront";

/** Compact catalogue code — prefer SKU, else initials from the name. */
export function blankDropCode(
  item: Pick<PublicCatalogItemCard, "sku" | "name">,
): string {
  const sku = item.sku?.trim();
  if (sku && sku.length > 0 && sku.length <= 14) {
    return sku.toUpperCase();
  }
  const parts = item.name
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.slice(0, 2)}${parts[1]!.slice(0, 2)}`
      .toUpperCase()
      .slice(0, 8);
  }
  return (parts[0] || "ITEM").slice(0, 8).toUpperCase();
}
