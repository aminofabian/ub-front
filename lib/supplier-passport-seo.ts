import type { Metadata } from "next";

import { APP_BASE_URL, PLATFORM_DOMAIN } from "@/lib/config";
import type {
  MarketplaceCatalogProductPreview,
  MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";
import {
  cleanLocationLabel,
  formatAreaPhrase,
} from "@/lib/storefront-seo-defaults";

/** Keep in sync with PLATFORM_SITE_NAME — avoid importing server-only platform-seo. */
const SITE_NAME = "Kiosk";

const META_DESCRIPTION_MAX = 158;
const PRODUCT_NAME_MAX = 28;

export type SupplierPassportSeoInput = {
  /** Handle without @, e.g. david-mutuku */
  username: string;
  displayName?: string | null;
  detail?: MarketplaceSupplierDetail | null;
};

function siteBase(): string {
  return APP_BASE_URL.replace(/\/+$/, "") || `https://${PLATFORM_DOMAIN}`;
}

export function supplierPassportPath(username: string): string {
  return `/s/${encodeURIComponent(username.trim())}`;
}

export function supplierPassportAbsoluteUrl(username: string): string {
  return `${siteBase()}${supplierPassportPath(username)}`;
}

/** "david-mutuku" → "David Mutuku" */
export function humanizeSupplierUsername(username: string): string {
  return username
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function resolveSupplierDisplayName(input: SupplierPassportSeoInput): string {
  const fromDetail = input.detail?.name?.trim();
  if (fromDetail) return fromDetail;
  const fromHub = input.displayName?.trim();
  if (fromHub) return fromHub;
  return humanizeSupplierUsername(input.username) || "Wholesale supplier";
}

function truncateLabel(value: string, max: number): string {
  const t = value.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 12 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Drop pack/size noise so titles stay scannable: "Coca-Cola 500ml Crate" → "Coca-Cola". */
function shortenProductForTitle(name: string): string {
  let value = name.trim();
  value = value.replace(
    /\b\d+([./]\d+)?\s?(ml|l|ltr|litre|liter|kg|g|gm|pcs?|pk|pack|crate|ctn|carton|dozen|dz|x)\b/gi,
    " ",
  );
  value = value.replace(
    /\b(crate|carton|pack|bundle|case|dozen|ctn|pcs?)\b/gi,
    " ",
  );
  value = value.replace(/\s+/g, " ").trim();
  return truncateLabel(value || name, 22);
}

/** Prefer delivery coverage, then multi-locations, then primary location. */
export function resolveSupplierServiceAreas(
  detail?: MarketplaceSupplierDetail | null,
): string[] {
  const buckets = [
    detail?.deliveryRegions ?? [],
    detail?.locations ?? [],
    detail?.location ? [detail.location] : [],
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const bucket of buckets) {
    for (const raw of bucket) {
      const cleaned = cleanLocationLabel(raw);
      if (!cleaned) continue;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(cleaned);
      if (out.length >= 4) return out;
    }
  }
  return out;
}

export function resolveSupplierProductHighlights(
  products: readonly MarketplaceCatalogProductPreview[] | null | undefined,
  limit = 3,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const product of products ?? []) {
    const raw = (product.parentItemName?.trim() || product.name?.trim() || "");
    if (!raw) continue;
    const label = truncateLabel(raw, PRODUCT_NAME_MAX);
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= limit) break;
  }
  return out;
}

function formatProductList(products: string[]): string | null {
  if (products.length === 0) return null;
  if (products.length === 1) return products[0]!;
  if (products.length === 2) return `${products[0]} & ${products[1]}`;
  return `${products[0]}, ${products[1]} & ${products[2]}`;
}

function categoryHints(detail?: MarketplaceSupplierDetail | null): string[] {
  const fromTags = (detail?.categoryTags ?? [])
    .map((t) => t.trim())
    .filter(Boolean);
  if (fromTags.length) return fromTags.slice(0, 3);

  const fromProducts: string[] = [];
  const seen = new Set<string>();
  for (const p of detail?.products ?? []) {
    const c = p.categoryName?.trim();
    if (!c) continue;
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    fromProducts.push(c);
    if (fromProducts.length >= 3) break;
  }
  return fromProducts;
}

/**
 * Creative, wholesale-forward title for Google / social.
 * Example: "David Mutuku — Wholesale Coca-Cola, Soap & Oil · Nairobi | Kiosk"
 */
export function supplierPassportTitle(input: SupplierPassportSeoInput): string {
  const name = resolveSupplierDisplayName(input);
  const rawProducts = resolveSupplierProductHighlights(input.detail?.products, 3);
  const products = rawProducts.map(shortenProductForTitle);
  const areas = resolveSupplierServiceAreas(input.detail);
  // Titles stay punchy — one primary area; description carries the full coverage.
  const primaryArea = areas[0] ?? null;
  const cats = categoryHints(input.detail).map(shortenProductForTitle);

  const candidates: string[] = [];

  // Prefer product + service-area titles (try fewer products until it fits).
  if (primaryArea) {
    for (const count of [3, 2, 1] as const) {
      if (products.length < count) continue;
      const list = formatProductList(products.slice(0, count));
      if (!list) continue;
      candidates.push(
        `${name} — Wholesale ${list} · ${primaryArea} | ${SITE_NAME}`,
      );
      candidates.push(
        `${name} | Wholesale Supplier · ${list} · ${primaryArea}`,
      );
    }
  }

  for (const count of [3, 2, 1] as const) {
    if (products.length < count) continue;
    const list = formatProductList(products.slice(0, count));
    if (!list) continue;
    candidates.push(
      `${name} — Wholesale Supplier of ${list} | ${SITE_NAME}`,
    );
  }

  if (primaryArea) {
    candidates.push(
      `${name} — Wholesale Supplier in ${primaryArea} | ${SITE_NAME}`,
    );
  }
  const catList = formatProductList(cats);
  if (catList) {
    candidates.push(`${name} — Wholesale ${catList} Supplier | ${SITE_NAME}`);
  }
  candidates.push(`${name} — Wholesale Supplier Passport | ${SITE_NAME}`);

  for (const candidate of candidates) {
    if (candidate.length <= 88) return candidate;
  }
  return `${name} — Wholesale Supplier | ${SITE_NAME}`;
}

/**
 * Search snippet: who they are (wholesale), what they stock, where they serve.
 */
export function supplierPassportDescription(
  input: SupplierPassportSeoInput,
): string {
  const name = resolveSupplierDisplayName(input);
  const products = resolveSupplierProductHighlights(input.detail?.products, 3);
  const areas = resolveSupplierServiceAreas(input.detail).slice(0, 2);
  const areaPhrase = formatAreaPhrase(areas);
  const cats = categoryHints(input.detail);
  const catList = formatProductList(cats);
  const packCount = input.detail?.products?.length ?? 0;
  const custom = input.detail?.description?.trim();

  const trySentence = (...parts: Array<string | null | undefined>) =>
    parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  const candidates: string[] = [];

  for (const count of [3, 2, 1] as const) {
    if (products.length < count) continue;
    const list = formatProductList(products.slice(0, count));
    if (!list) continue;
    if (areaPhrase) {
      candidates.push(
        trySentence(
          `${name} is a wholesale supplier on Kiosk.ke stocking ${list} for shops across ${areaPhrase}.`,
          packCount > count ? `${packCount} wholesale lines listed.` : "Order by the pack and restock your shelf.",
          custom && custom.length < 60 ? custom : null,
        ),
      );
      candidates.push(
        trySentence(
          `${name} — wholesale supplier of ${list} for shops in ${areaPhrase}.`,
          "Browse pack prices on Kiosk.ke.",
        ),
      );
    }
    candidates.push(
      trySentence(
        `${name} is a wholesale supplier on Kiosk.ke — shop packs of ${list} at wholesale prices.`,
        "Order by the pack and restock your shelf.",
      ),
    );
  }

  if (catList && areaPhrase) {
    candidates.push(
      `${name} is a wholesale ${catList.toLowerCase()} supplier serving ${areaPhrase} on Kiosk.ke.`,
    );
  }
  if (areaPhrase) {
    candidates.push(
      `${name} is a wholesale supplier serving shops across ${areaPhrase} on Kiosk.ke. Order wholesale, track deliveries, and keep your till stocked.`,
    );
  }
  candidates.push(
    `${name} is a wholesale supplier on Kiosk.ke — browse the catalogue and restock your shop by the pack.`,
  );

  for (const candidate of candidates) {
    if (candidate.length <= META_DESCRIPTION_MAX) return candidate;
  }

  const fallback = candidates[candidates.length - 1]!;
  const cut = fallback.slice(0, META_DESCRIPTION_MAX - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function supplierPassportKeywords(
  input: SupplierPassportSeoInput,
): string[] {
  const name = resolveSupplierDisplayName(input);
  const products = resolveSupplierProductHighlights(input.detail?.products, 4);
  const areas = resolveSupplierServiceAreas(input.detail);
  const cats = categoryHints(input.detail);

  const keywords = [
    name,
    `${name} wholesale`,
    `${name} supplier`,
    "wholesale supplier Kenya",
    "wholesale supplier",
    "bulk supply Kenya",
    "shop wholesale Kenya",
    "Kiosk marketplace",
    "kiosk.ke",
    ...areas.flatMap((area) => [
      `${area} wholesaler`,
      `wholesale supplier ${area}`,
    ]),
    ...products.map((p) => `wholesale ${p}`),
    ...cats.map((c) => `wholesale ${c}`),
  ];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keywords) {
    const k = raw.trim();
    if (!k) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
    if (out.length >= 16) break;
  }
  return out;
}

export function supplierPassportMetadata(
  input: SupplierPassportSeoInput,
): Metadata {
  const title = supplierPassportTitle(input);
  const description = supplierPassportDescription(input);
  const url = supplierPassportAbsoluteUrl(input.username);
  const keywords = supplierPassportKeywords(input);
  const ogTitle = title.includes(SITE_NAME)
    ? title
    : `${title} · ${SITE_NAME}`;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_KE",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
    robots: { index: true, follow: true },
  };
}

/** Schema.org WholesaleStore + Product highlights for passport pages. */
export function supplierPassportJsonLd(input: SupplierPassportSeoInput) {
  const name = resolveSupplierDisplayName(input);
  const description = supplierPassportDescription(input);
  const url = supplierPassportAbsoluteUrl(input.username);
  const areas = resolveSupplierServiceAreas(input.detail);
  const products = resolveSupplierProductHighlights(input.detail?.products, 6);
  const detail = input.detail;

  const areaServed =
    areas.length > 0
      ? areas.map((area) => ({
          "@type": "Place",
          name: area,
        }))
      : { "@type": "Country", name: "Kenya" };

  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "WholesaleStore"],
    name,
    url,
    description,
    ...(input.username ? { alternateName: `@${input.username}` } : {}),
    ...(detail?.contactPhone ? { telephone: detail.contactPhone } : {}),
    ...(detail?.contactEmail ? { email: detail.contactEmail } : {}),
    areaServed,
    ...(areas[0]
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: areas[0],
            addressCountry: "KE",
          },
        }
      : {}),
    ...(products.length
      ? {
          makesOffer: products.map((productName) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "Product",
              name: productName,
            },
            businessFunction: "https://schema.org/Sell",
            availableAtOrFrom: {
              "@type": "WholesaleStore",
              name,
            },
          })),
        }
      : {}),
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
  };
}

/** Reuse passport copy on marketplace /marketplace/s/[slug] pages. */
export function marketplaceWholesaleSupplierDescription(
  detail: MarketplaceSupplierDetail,
): string {
  return supplierPassportDescription({
    username: detail.slug?.split("--")[0] || detail.name,
    displayName: detail.name,
    detail,
  });
}

export function marketplaceWholesaleSupplierTitle(
  detail: MarketplaceSupplierDetail,
): string {
  return supplierPassportTitle({
    username: detail.slug?.split("--")[0] || detail.name,
    displayName: detail.name,
    detail,
  });
}
