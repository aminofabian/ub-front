import "server-only";

/** Marketing site (kiosk.ke apex) — titles, descriptions, and JSON-LD. */
export const PLATFORM_SITE_NAME = "Kiosk";

export const PLATFORM_TITLE =
  "Kiosk — Point of Sale, Storefront & Cashier";

/** ~155 chars — aligned with landing copy; avoids repeating the domain in-body. */
export const PLATFORM_DESCRIPTION =
  "Point of sale for shop counters in Kenya — scan barcodes, take M-Pesa, sell offline when the network drops, and run your kiosk.ke storefront. Free to start.";

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
  "Kiosk help for shop owners and online shoppers in Kenya — till setup, M-Pesa, inventory, orders, and delivery.";
