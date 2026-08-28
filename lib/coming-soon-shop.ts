/**
 * Dresses the ecommerce coming-soon landing with a merchant's own catalog.
 * The shelf is open for browsing. The bag is not. No invented discounts,
 * SKU counts, or neighbourhood copy.
 */

import {
  isGarbageProductName,
  isPlaceholderImportCategory,
  normalizeProductDisplayName,
} from "@/lib/catalog-display";
import {
  buildComingSoonEditorial,
  pickComingSoonShelf,
  type ComingSoonChip,
  type ComingSoonEditorialInput,
} from "@/lib/coming-soon-editorial";
import { formatMoney, resolveCurrencyCode } from "@/lib/money";
import type { PublicCategory } from "@/lib/public-storefront";

const SHELF_CAP = 16;
const COLLECTION_CAP = 8;
const DESC_WORD_CAP = 24;

export type ComingSoonShopProduct = {
  id: string;
  name: string;
  price: string;
  regularPrice: string | null;
  imageUrl: string | null;
  imageAlt: string;
};

export type ComingSoonShopCollection = {
  id: string;
  name: string;
  count: string | null;
};

export type ComingSoonShopContent = {
  displayName: string;
  description: string;
  chips: ComingSoonChip[];
  collections: ComingSoonShopCollection[];
  featured: ComingSoonShopProduct | null;
  products: ComingSoonShopProduct[];
  productCount: number;
  place: string | null;
  hours: string | null;
  contactHref: string | null;
  contactLabel: string | null;
  heroFallbackUrl: string | null;
};

export function buildComingSoonShop(
  input: ComingSoonEditorialInput,
): ComingSoonShopContent {
  const editorial = buildComingSoonEditorial(input);
  const currency = input.currency ?? null;
  const items = pickComingSoonShelf(
    input.featured,
    input.catalogItems,
    SHELF_CAP,
  );
  const products = items.map((item) => toShopProduct(item, currency));
  const featured =
    products.find((p) => p.imageUrl) ?? products[0] ?? null;
  const grid = featured
    ? products.filter((p) => p.id !== featured.id)
    : products;
  const collections = pickCollections(input.categories);
  const productCount = resolveProductCount(input.totalCount, products.length);

  return {
    displayName: editorial.displayName,
    description: shopDescription(editorial.displayName, input, products),
    chips: editorial.chips,
    collections,
    featured,
    products: grid,
    productCount,
    place: editorial.footerPlace,
    hours: input.landingContent?.hours?.trim() || null,
    contactHref: editorial.contactHref,
    contactLabel: editorial.contactLabel,
    heroFallbackUrl: editorial.heroFallbackUrl,
  };
}

function toShopProduct(
  item: {
    id: string;
    name: string;
    price: number | null;
    regularPrice?: number | null;
    imageUrl: string | null;
  },
  currency: string | null,
): ComingSoonShopProduct {
  const name = shelfName(item.name);
  const price = formatShopPrice(currency, item.price);
  const regularRaw = item.regularPrice;
  const showRegular =
    regularRaw != null &&
    Number.isFinite(regularRaw) &&
    item.price != null &&
    regularRaw > item.price;
  return {
    id: item.id,
    name,
    price,
    regularPrice: showRegular ? formatShopPrice(currency, regularRaw) : null,
    imageUrl: item.imageUrl?.trim() || null,
    imageAlt: name,
  };
}

function pickCollections(
  categories: readonly PublicCategory[] | null | undefined,
): ComingSoonShopCollection[] {
  return (categories ?? [])
    .filter((c) => {
      const name = c.name?.trim() ?? "";
      if (!name || isPlaceholderImportCategory(name)) return false;
      if (c.parentId) return false;
      return true;
    })
    .slice(0, COLLECTION_CAP)
    .map((cat) => ({
      id: cat.id,
      name: cat.name.trim(),
      count:
        cat.itemCount && cat.itemCount > 0
          ? `${formatCount(cat.itemCount)}`
          : null,
    }));
}

function shopDescription(
  displayName: string,
  input: ComingSoonEditorialInput,
  products: ComingSoonShopProduct[],
): string {
  const fromMerchant =
    input.landingContent?.subheadline?.trim() ||
    input.announcement?.trim() ||
    "";
  if (fromMerchant) return clipWords(fromMerchant, DESC_WORD_CAP);
  if (products.length > 0) {
    return "Browse the shelf. Prices are up. The bag opens when we do.";
  }
  return `${displayName} is opening online. Be first to shop.`;
}

function resolveProductCount(
  totalCount: number | null | undefined,
  fallback: number,
): number {
  if (totalCount != null && Number.isFinite(totalCount) && totalCount > 0) {
    return Math.round(totalCount);
  }
  return fallback;
}

function formatShopPrice(
  currency: string | null | undefined,
  amount: number | null | undefined,
): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  return formatMoney(amount, resolveCurrencyCode(currency));
}

function shelfName(name: string | null | undefined): string {
  const n = name?.trim() ?? "";
  if (!n || isGarbageProductName(n)) return "";
  return normalizeProductDisplayName(n);
}

function clipWords(text: string, max: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const words = trimmed.split(" ").filter(Boolean);
  if (words.length <= max) return trimmed;
  return `${words.slice(0, max).join(" ")}.`;
}

function formatCount(n: number): string {
  return new Intl.NumberFormat("en").format(n);
}
