import "server-only";

/** Marketing site (kiosk.ke apex) — titles, descriptions, and JSON-LD. */
export const PLATFORM_SITE_NAME = "Kiosk";

export const PLATFORM_TITLE =
  "Kiosk.ke — Point of Sale, Storefront & Cashier";

/** Short line for OG/Twitter image eyebrow. */
export const PLATFORM_TAGLINE = "Point of sale · storefront · cashier";

/**
 * ~155 chars for search snippets + social cards.
 * Matches landing hero: scan, M-Pesa, offline, storefront.
 */
export const PLATFORM_DESCRIPTION =
  "Run your Kenyan shop on Kiosk.ke — barcode POS, M-Pesa at the counter, offline sales when the network drops, and an online storefront. Free to start.";

/** One-line blurb used on the styled Open Graph / Twitter image. */
export const PLATFORM_OG_DESCRIPTION =
  "Scan barcodes, take M-Pesa, keep selling when the network drops.";

export const PLATFORM_KEYWORDS = [
  "POS Kenya",
  "point of sale",
  "M-Pesa POS",
  "barcode scanner",
  "retail POS",
  "shop counter",
  "offline POS",
  "storefront",
  "cashier",
  "inventory",
  "kiosk.ke",
  "small business POS",
] as const;

export const PLATFORM_THEME_COLOR = "#28A745";

export function platformOrganizationJsonLd(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: PLATFORM_SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description: PLATFORM_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KES",
    },
    areaServed: {
      "@type": "Country",
      name: "Kenya",
    },
  };
}

/** Help center hub defaults (titles live in lib/help/seo.ts for page metadata). */
export const HELP_CENTER_PATH = "/help";

export const HELP_CENTER_DESCRIPTION =
  "Kiosk.ke help for shop owners and online shoppers in Kenya — till setup, M-Pesa, inventory, orders, and delivery.";
