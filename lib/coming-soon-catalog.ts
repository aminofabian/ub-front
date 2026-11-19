import {
  comingSoonShelfFromCards,
  type ComingSoonShelfItem,
} from "@/lib/coming-soon-editorial";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";

export const COMING_SOON_PAGE_LIMIT = 24;

/** First shelf: the catalog page, then featured items that were not already on it. */
export function seedComingSoonShelf(
  featured: readonly PublicCatalogItemCard[] | null | undefined,
  catalog: readonly PublicCatalogItemCard[] | null | undefined,
  currency: string | null | undefined,
): ComingSoonShelfItem[] {
  const cards: PublicCatalogItemCard[] = [];
  const seen = new Set<string>();
  for (const item of [...(catalog ?? []), ...(featured ?? [])]) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    cards.push(item);
  }
  return comingSoonShelfFromCards(cards, currency);
}

export function appendComingSoonShelf(
  current: readonly ComingSoonShelfItem[],
  incoming: readonly ComingSoonShelfItem[],
): ComingSoonShelfItem[] {
  const seen = new Set(current.map((item) => item.id));
  const next = [...current];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

/** Honest progress while later pages are still off screen. */
export function comingSoonShelfCount(
  shown: number,
  total: number | null | undefined,
): string | null {
  if (shown <= 0 || total == null || total <= shown) return null;
  return `${shown} of ${total}`;
}
