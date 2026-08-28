/**
 * Dresses the coming-soon editorial landing with a merchant's own catalog,
 * place, and copy. No grocery stock photos, no invented SKU counts, no
 * neighbourhood mini-mart voice unless that shop actually wrote it.
 */

import {
  isGarbageProductName,
  isPlaceholderImportCategory,
  normalizeProductDisplayName,
} from "@/lib/catalog-display";
import { formatMoney, resolveCurrencyCode } from "@/lib/money";
import type {
  PublicCatalogItemCard,
  PublicCatalogType,
  PublicCategory,
} from "@/lib/public-storefront";
import type { LandingContent } from "@/lib/storefront-templates";

const HERO_WORD_CAP = 20;
const HERO_CELL_CAP = 4;
const TEASER_CAP = 8;
const MARQUEE_CAP = 10;
const PROMISE_CAP = 4;

export type ComingSoonChipKind =
  | "products"
  | "place"
  | "hours"
  | "pay"
  | "delivery";

export type ComingSoonChip = {
  kind: ComingSoonChipKind;
  label: string;
};

export type ComingSoonHeroCell = {
  name: string;
  price: string;
  imageUrl: string | null;
  imageAlt: string;
};

export type ComingSoonPromise = {
  key: string;
  title: string;
  desc: string;
  imageUrl: string | null;
};

export type ComingSoonTeaser = {
  key: string;
  name: string;
  count: string;
  imageUrl: string | null;
};

export type ComingSoonStat = {
  value: string;
  label: string;
};

export type ComingSoonEditorialInput = {
  storeName: string;
  landingContent?: LandingContent | null;
  catalogItems?: readonly PublicCatalogItemCard[] | null;
  featured?: readonly PublicCatalogItemCard[] | null;
  categories?: readonly PublicCategory[] | null;
  types?: readonly PublicCatalogType[] | null;
  currency?: string | null;
  totalCount?: number | null;
  areaLabel?: string | null;
  announcement?: string | null;
  deliveryAreaNames?: readonly string[] | null;
  countryCode?: string | null;
  heroFallbackUrl?: string | null;
};

export type ComingSoonEditorialContent = {
  displayName: string;
  firstWord: string;
  eyebrow: string;
  headline: {
    mode: "editorial" | "custom";
    lines: readonly string[];
    accentIndex: number;
  };
  description: string;
  chips: ComingSoonChip[];
  heroCells: ComingSoonHeroCell[];
  heroFallbackUrl: string | null;
  floatingTag: { title: string; subtitle: string } | null;
  marquee: string[];
  shelfHeading: string;
  promises: ComingSoonPromise[];
  teasers: ComingSoonTeaser[];
  stats: ComingSoonStat[];
  footerPlace: string | null;
  contactHref: string | null;
  contactLabel: string | null;
};

export function buildComingSoonEditorial(
  input: ComingSoonEditorialInput,
): ComingSoonEditorialContent {
  const displayName = input.storeName.trim() || "Our shop";
  const firstWord = displayName.split(/\s+/).find(Boolean) ?? displayName;
  const currency = input.currency ?? null;
  const countryCode = input.countryCode ?? null;
  const items = pickShelfItems(input.featured, input.catalogItems);
  const categories = pickCategories(input.categories);
  const types = pickTypes(input.types);
  const productCount = resolveProductCount(input.totalCount, items.length);
  const place = firstPlace(input.areaLabel, input.landingContent?.address);
  const hours = input.landingContent?.hours?.trim() || null;
  const deliveryAreas = (input.deliveryAreaNames ?? [])
    .map((n) => n.trim())
    .filter(Boolean);
  const description = clipWords(
    resolveDescription({
      displayName,
      landing: input.landingContent,
      announcement: input.announcement,
      categories,
      types,
      items,
    }),
    HERO_WORD_CAP,
  );

  const heroCells = items.slice(0, HERO_CELL_CAP).map((item) => {
    const name = shelfName(item.name);
    return {
      name,
      price: formatShelfPrice(currency, item.price),
      imageUrl: item.imageUrl?.trim() || null,
      imageAlt: name,
    };
  });

  const teasers = buildTeasers(categories, items.slice(HERO_CELL_CAP), currency);
  const chips = buildChips({
    productCount,
    place,
    hours,
    currency,
    countryCode,
    deliveryAreas,
  });
  const promises = buildPromises({
    items,
    place,
    hours,
    currency,
    countryCode,
    displayName,
  });

  return {
    displayName,
    firstWord,
    eyebrow: displayName,
    headline: resolveHeadline(displayName, input.landingContent?.headline),
    description,
    chips,
    heroCells,
    heroFallbackUrl: input.heroFallbackUrl?.trim() || null,
    floatingTag: buildFloatingTag({ productCount, place, hours, items }),
    marquee: buildMarquee(displayName, items, categories, types),
    shelfHeading: items.length > 0 ? "Already on the shelf" : "When we open",
    promises,
    teasers,
    stats: buildStats({ productCount, categories, place }),
    footerPlace: place,
    contactHref: contactHref(input.landingContent),
    contactLabel: contactLabel(input.landingContent),
  };
}

function resolveHeadline(
  storeName: string,
  raw: string | null | undefined,
): ComingSoonEditorialContent["headline"] {
  const headline = raw?.trim() ?? "";
  const normalizedStore = storeName.trim().toLowerCase();
  if (
    headline &&
    headline.toLowerCase() !== normalizedStore &&
    headline.split(/\s+/).length >= 2
  ) {
    const parts = headline
      .split(/(?<=[.!?])\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const lines = (parts.length > 1 ? parts : [headline]).slice(0, 3);
    return { mode: "custom", lines, accentIndex: Math.min(1, lines.length - 1) };
  }
  return {
    mode: "editorial",
    lines: ["Something", "worth", "waiting for."],
    accentIndex: 1,
  };
}

function resolveDescription(opts: {
  displayName: string;
  landing?: LandingContent | null;
  announcement?: string | null;
  categories: PublicCategory[];
  types: PublicCatalogType[];
  items: PublicCatalogItemCard[];
}): string {
  const fromMerchant =
    opts.landing?.subheadline?.trim() || opts.announcement?.trim() || "";
  if (fromMerchant) return fromMerchant;

  const catNames = opts.categories.map((c) => c.name.trim()).filter(Boolean);
  if (catNames.length > 0) {
    return `${opts.displayName} is opening with ${listPhrase(catNames)}.`;
  }
  const typeNames = opts.types.map((t) => t.label.trim()).filter(Boolean);
  if (typeNames.length > 0) {
    return `${opts.displayName} is opening with ${listPhrase(typeNames)}.`;
  }
  const productNames = opts.items.map((i) => shelfName(i.name)).filter(Boolean);
  if (productNames.length > 0) {
    return `${opts.displayName} is opening with ${listPhrase(productNames)}.`;
  }
  return `${opts.displayName} is opening online. Be first to shop.`;
}

function pickShelfItems(
  featured: readonly PublicCatalogItemCard[] | null | undefined,
  catalog: readonly PublicCatalogItemCard[] | null | undefined,
): PublicCatalogItemCard[] {
  return pickComingSoonShelf(featured, catalog, HERO_CELL_CAP + TEASER_CAP);
}

/** Ranked unique products with names and photos preferred. Shared by coming-soon templates. */
export function pickComingSoonShelf(
  featured: readonly PublicCatalogItemCard[] | null | undefined,
  catalog: readonly PublicCatalogItemCard[] | null | undefined,
  limit: number,
): PublicCatalogItemCard[] {
  const seen = new Set<string>();
  const out: PublicCatalogItemCard[] = [];
  const push = (item: PublicCatalogItemCard | undefined) => {
    if (!item?.id || seen.has(item.id)) return;
    if (isGarbageProductName(item.name)) return;
    seen.add(item.id);
    out.push(item);
  };
  const pool = [...(featured ?? []), ...(catalog ?? [])];
  const scored = [...pool].sort((a, b) => shelfScore(b) - shelfScore(a));
  for (const item of scored) {
    if (out.length >= limit) break;
    push(item);
  }
  return out;
}

function shelfScore(item: PublicCatalogItemCard): number {
  let score = 0;
  if (item.name?.trim()) score += 4;
  if (item.imageUrl?.trim()) score += 3;
  if (item.price != null && item.price > 0) score += 2;
  return score;
}

function pickCategories(
  categories: readonly PublicCategory[] | null | undefined,
): PublicCategory[] {
  return (categories ?? [])
    .filter((c) => {
      const name = c.name?.trim() ?? "";
      if (!name || isPlaceholderImportCategory(name)) return false;
      if (c.parentId) return false;
      return true;
    })
    .slice(0, TEASER_CAP);
}

function pickTypes(
  types: readonly PublicCatalogType[] | null | undefined,
): PublicCatalogType[] {
  return (types ?? [])
    .filter((t) => t.label?.trim())
    .slice(0, TEASER_CAP);
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

function firstPlace(
  areaLabel?: string | null,
  address?: string | null,
): string | null {
  const area = areaLabel?.trim() || "";
  if (area) return area;
  const addr = address?.trim() || "";
  if (!addr) return null;
  const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] || addr;
}

function buildChips(opts: {
  productCount: number;
  place: string | null;
  hours: string | null;
  currency: string | null;
  countryCode: string | null;
  deliveryAreas: string[];
}): ComingSoonChip[] {
  const chips: ComingSoonChip[] = [];
  if (opts.productCount > 0) {
    chips.push({
      kind: "products",
      label: `${formatCount(opts.productCount)} ${opts.productCount === 1 ? "product" : "products"}`,
    });
  }
  if (opts.place) {
    chips.push({ kind: "place", label: opts.place });
  }
  if (opts.hours) {
    chips.push({ kind: "hours", label: opts.hours });
  } else if (opts.deliveryAreas.length > 0) {
    chips.push({
      kind: "delivery",
      label:
        opts.deliveryAreas.length === 1
          ? `Delivers to ${opts.deliveryAreas[0]}`
          : `${opts.deliveryAreas.length} delivery areas`,
    });
  } else if (showsMpesa(opts.currency, opts.countryCode)) {
    chips.push({ kind: "pay", label: "M-Pesa ready" });
  }
  return chips.slice(0, 3);
}

function buildPromises(opts: {
  items: PublicCatalogItemCard[];
  place: string | null;
  hours: string | null;
  currency: string | null;
  countryCode: string | null;
  displayName: string;
}): ComingSoonPromise[] {
  const fromItems = opts.items.slice(0, PROMISE_CAP).map((item) => {
    const name = shelfName(item.name);
    const price = formatShelfPrice(opts.currency, item.price);
    return {
      key: item.id,
      title: name,
      desc: price
        ? `${price}, waiting on the shelf.`
        : "Ready when the shop opens.",
      imageUrl: item.imageUrl?.trim() || null,
    };
  });
  if (fromItems.length >= 3) return fromItems;

  const extras: ComingSoonPromise[] = [];
  if (opts.place) {
    extras.push({
      key: "place",
      title: opts.place,
      desc: `${opts.displayName} is opening for this neighbourhood.`,
      imageUrl: null,
    });
  }
  if (opts.hours) {
    extras.push({
      key: "hours",
      title: "Hours you already know",
      desc: opts.hours,
      imageUrl: null,
    });
  }
  if (showsMpesa(opts.currency, opts.countryCode)) {
    extras.push({
      key: "pay",
      title: "Pay the usual way",
      desc: "M-Pesa at checkout, same as in the shop.",
      imageUrl: null,
    });
  }
  extras.push({
    key: "notify",
    title: "Be first in line",
    desc: "Leave your email and we will tell you when the doors open.",
    imageUrl: null,
  });

  const merged = [...fromItems];
  for (const extra of extras) {
    if (merged.length >= PROMISE_CAP) break;
    if (merged.some((p) => p.key === extra.key)) continue;
    merged.push(extra);
  }
  return merged.slice(0, PROMISE_CAP);
}

function buildTeasers(
  categories: PublicCategory[],
  leftoverItems: PublicCatalogItemCard[],
  currency: string | null,
): ComingSoonTeaser[] {
  if (categories.length > 0) {
    return categories.slice(0, TEASER_CAP).map((cat) => ({
      key: cat.id,
      name: cat.name.trim(),
      count:
        cat.itemCount && cat.itemCount > 0
          ? `${formatCount(cat.itemCount)} ${cat.itemCount === 1 ? "item" : "items"}`
          : "Coming with us",
      imageUrl: categoryImage(cat),
    }));
  }
  return leftoverItems.slice(0, TEASER_CAP).map((item) => {
    const name = shelfName(item.name);
    const price = formatShelfPrice(currency, item.price);
    return {
      key: item.id,
      name,
      count: price || "On the shelf",
      imageUrl: item.imageUrl?.trim() || null,
    };
  });
}

function categoryImage(cat: PublicCategory): string | null {
  const icon = cat.icon?.trim() ?? "";
  if (/^https?:\/\//i.test(icon) || icon.startsWith("/")) return icon;
  return null;
}

function buildMarquee(
  storeName: string,
  items: PublicCatalogItemCard[],
  categories: PublicCategory[],
  types: PublicCatalogType[],
): string[] {
  const names = [
    storeName,
    "Opening soon",
    ...categories.map((c) => c.name.trim()),
    ...types.map((t) => t.label.trim()),
    ...items.map((i) => shelfName(i.name)),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
    if (unique.length >= MARQUEE_CAP) break;
  }
  if (unique.length === 1) unique.push("Opening soon");
  return unique;
}

function buildFloatingTag(opts: {
  productCount: number;
  place: string | null;
  hours: string | null;
  items: PublicCatalogItemCard[];
}): { title: string; subtitle: string } | null {
  if (opts.productCount > 0) {
    return {
      title: `${formatCount(opts.productCount)} ${opts.productCount === 1 ? "product" : "products"}`,
      subtitle: opts.place ? `From ${opts.place}` : "Already photographed",
    };
  }
  if (opts.place) {
    return { title: "Opening soon", subtitle: opts.place };
  }
  if (opts.hours) {
    return { title: "Opening soon", subtitle: opts.hours };
  }
  return { title: "Opening soon", subtitle: "Be first to shop" };
}

function buildStats(opts: {
  productCount: number;
  categories: PublicCategory[];
  place: string | null;
}): ComingSoonStat[] {
  const stats: ComingSoonStat[] = [];
  if (opts.productCount > 0) {
    stats.push({
      value: formatCount(opts.productCount),
      label: opts.productCount === 1 ? "Product" : "Products",
    });
  }
  if (opts.categories.length > 0) {
    stats.push({
      value: formatCount(opts.categories.length),
      label: opts.categories.length === 1 ? "Collection" : "Collections",
    });
  }
  if (opts.place) {
    stats.push({ value: clipChars(opts.place, 14), label: "Area" });
  }
  return stats.slice(0, 4);
}

function contactHref(content?: LandingContent | null): string | null {
  const wa = content?.whatsapp?.replace(/\D/g, "") ?? "";
  if (wa) return `https://wa.me/${wa}`;
  const phone = content?.phone?.replace(/\D/g, "") ?? "";
  if (phone) return `tel:${phone}`;
  return null;
}

function contactLabel(content?: LandingContent | null): string | null {
  if (content?.whatsapp?.trim()) return "WhatsApp";
  if (content?.phone?.trim()) return "Call us";
  return null;
}

function formatShelfPrice(
  currency: string | null | undefined,
  amount: number | null | undefined,
): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  return formatMoney(amount, resolveCurrencyCode(currency));
}

function showsMpesa(
  currency: string | null | undefined,
  countryCode: string | null | undefined,
): boolean {
  const cur = (currency ?? "").trim().toUpperCase();
  const cc = (countryCode ?? "").trim().toUpperCase();
  return cur === "KES" || cc === "KE";
}

function shelfName(name: string | null | undefined): string {
  const n = name?.trim() ?? "";
  if (!n || isGarbageProductName(n)) return "";
  return normalizeProductDisplayName(n);
}

function listPhrase(items: string[], max = 3): string {
  const slice = items.filter(Boolean).slice(0, max);
  if (slice.length === 0) return "";
  if (slice.length === 1) return slice[0]!;
  if (slice.length === 2) return `${slice[0]} and ${slice[1]}`;
  return `${slice.slice(0, -1).join(", ")}, and ${slice[slice.length - 1]}`;
}

function clipWords(text: string, max: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const words = trimmed.split(" ").filter(Boolean);
  if (words.length <= max) return trimmed;
  return `${words.slice(0, max).join(" ")}.`;
}

function clipChars(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1)).trimEnd()}`;
}

function formatCount(n: number): string {
  return new Intl.NumberFormat("en").format(n);
}
