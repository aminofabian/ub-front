import type { PublicCatalogItemCard } from "@/lib/public-storefront";

export function appendCatalogPage(
  prev: PublicCatalogItemCard[],
  incoming: PublicCatalogItemCard[],
  requestCursor: string,
  nextCursor: string | null | undefined,
): { items: PublicCatalogItemCard[]; next: string | null } {
  const seen = new Set(prev.map((item) => item.id));
  const extra = incoming.filter((item) => !seen.has(item.id));
  if (extra.length === 0 || nextCursor === requestCursor) {
    return { items: prev, next: null };
  }
  return { items: [...prev, ...extra], next: nextCursor ?? null };
}
