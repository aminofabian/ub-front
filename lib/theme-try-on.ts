import {
  fetchItemsPage,
  itemListThumbnailUrl,
  type ItemSummaryRecord,
} from "@/lib/api";
import { shareInflight } from "@/lib/share-inflight";

/** How many real SKUs the door phones sample from. */
const SAMPLE_SIZE = 24;
/** Branding and the atelier paint previews from this list; keep it briefly. */
const SAMPLE_TTL_MS = 5 * 60_000;

let sampleCache: { at: number; items: ItemSummaryRecord[] } | null = null;

/**
 * The real catalogue slice every theme door phone is painted from.
 *
 * Branding's template section and the themes atelier each mount previews, and
 * flipping between the two screens used to download the same 24 SKUs again.
 * One shared, briefly cached page serves both.
 */
export function loadThemeSampleItems(): Promise<ItemSummaryRecord[]> {
  if (sampleCache && Date.now() - sampleCache.at < SAMPLE_TTL_MS) {
    return Promise.resolve(sampleCache.items);
  }
  return shareInflight("items/theme-try-on-sample", async () => {
    const page = await fetchItemsPage(undefined, {
      catalogScope: "SKUS_ONLY",
      page: 0,
      size: SAMPLE_SIZE,
    });
    sampleCache = { at: Date.now(), items: page.content };
    return page.content;
  });
}

export type ThemeTryOnProduct = {
  name: string;
  imageUrl?: string | null;
  /** Formatted shelf price, e.g. "KSh 450" (or "KSh 450/kg" when weighed). */
  price?: string | null;
  /** Numeric shelf price for cart totals; null when the record has none. */
  priceValue?: number | null;
};

export type ThemeTryOnIdentity = {
  storeName: string;
  logoUrl?: string | null;
  brandPrimary?: string | null;
  hours?: string | null;
  address?: string | null;
  products?: ThemeTryOnProduct[];
  heroUrl?: string | null;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  KES: "KSh",
  USD: "$",
  GBP: "£",
  EUR: "€",
  UGX: "USh",
  TZS: "TSh",
  RWF: "FRw",
  ZAR: "R",
};

/** Currency-aware money label for the miniature, e.g. "KSh 1,250". */
export function tryOnMoneyLabel(amount: number, currency = "KES"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol} ${Math.round(amount).toLocaleString("en-US")}`;
}

/** Shelf-price label for the miniature; `null` when the record has no price. */
export function tryOnPrice(
  item: ItemSummaryRecord,
  currency = "KES",
): { label: string; value: number } | null {
  const raw = item.bundlePrice;
  if (raw == null || raw === "") return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const weighed =
    item.isWeighed === true ||
    (item.unitType?.toLowerCase().includes("kg") ?? false);
  return {
    label: weighed
      ? `${tryOnMoneyLabel(amount, currency)}/kg`
      : tryOnMoneyLabel(amount, currency),
    value: amount,
  };
}

/**
 * First six sellable items with a photo, preferring in-stock. Name-only
 * tiles are a last resort so an empty catalogue still doesn't invent SKUs.
 * Six fills the gazette classified grid; other phones only read the first three.
 */
export function pickTryOnProducts(
  items: readonly ItemSummaryRecord[],
  currency = "KES",
): ThemeTryOnProduct[] {
  const sellable = items.filter(
    (item) => item.groupLabelOnly !== true && item.active !== false,
  );
  const withImage = sellable.filter((item) => itemListThumbnailUrl(item));
  const inStock = withImage.filter((item) => {
    if (item.stockQty == null || item.stockQty === "") return true;
    const qty = Number(item.stockQty);
    return Number.isFinite(qty) ? qty > 0 : true;
  });
  const pool = (
    inStock.length > 0 ? inStock : withImage.length > 0 ? withImage : sellable
  ).slice(0, 6);
  return pool.map((item) => {
    const price = tryOnPrice(item, currency);
    return {
      name: item.name,
      imageUrl: itemListThumbnailUrl(item),
      price: price?.label ?? null,
      priceValue: price?.value ?? null,
    };
  });
}

/**
 * Category names first, then product names — haystack for theme scoring so a
 * shop called "Kamau" that sells meat still ranks as a butcher stall.
 */
export function catalogRecommendTokens(
  items: readonly ItemSummaryRecord[],
): string[] {
  const categories: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const category = item.categoryName?.trim();
    if (!category) continue;
    const key = category.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    categories.push(category);
  }
  const names = items
    .filter((item) => item.groupLabelOnly !== true)
    .map((item) => item.name.trim())
    .filter(Boolean)
    .slice(0, 24);
  return [...categories, ...names];
}
