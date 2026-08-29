import "server-only";

import {
  PLATFORM_FAQS,
  type PlatformFaq,
} from "@/lib/platform-seo-content";
import { KIOSK_PLATFORM_CONTACT } from "@/lib/platform-contact";

export type { PlatformFaq };
export { PLATFORM_FAQS };

/** Marketing site (kiosk.ke apex) — titles, descriptions, and JSON-LD. */
export const PLATFORM_SITE_NAME = "Kiosk";

/**
 * ~55–60 chars for SERP titles. Primary keyword front-loaded: POS Kenya.
 */
export const PLATFORM_TITLE =
  "POS Kenya — Point of Sale with M-Pesa | Kiosk.ke";

/** Short line for OG/Twitter image eyebrow. */
export const PLATFORM_TAGLINE = "POS · M-Pesa · Kenya";

/**
 * ~155 chars for search snippets + social cards.
 * Matches landing hero: scan, M-Pesa, offline, storefront.
 */
export const PLATFORM_DESCRIPTION =
  "Kiosk.ke is the POS system for Kenyan shops — barcode scanning, M-Pesa STK at the counter, offline sales, inventory & an online storefront. Free to start.";

/** One-line blurb used on the styled Open Graph / Twitter image. */
export const PLATFORM_OG_DESCRIPTION =
  "The POS Kenya shops run on — scan, M-Pesa STK, offline-ready.";

export const PLATFORM_KEYWORDS = [
  "POS Kenya",
  "POS in Kenya",
  "point of sale Kenya",
  "POS system Kenya",
  "best POS Kenya",
  "M-Pesa POS",
  "M-Pesa point of sale",
  "barcode POS Kenya",
  "retail POS Kenya",
  "mini mart POS",
  "duka POS",
  "shop POS Kenya",
  "offline POS",
  "cashier system Kenya",
  "inventory software Kenya",
  "online storefront Kenya",
  "kiosk.ke",
  "free POS Kenya",
  "small business POS Kenya",
] as const;

export const PLATFORM_THEME_COLOR = "#28A745";

export function platformFaqJsonLd() {
  return {
    "@type": "FAQPage",
    mainEntity: PLATFORM_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function platformOrganizationJsonLd(siteUrl: string) {
  const base = siteUrl.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: "Kiosk Technologies Ltd",
        legalName: "Kiosk Technologies Ltd",
        url: base,
        logo: `${base}/icon`,
        foundingLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            postalCode: KIOSK_PLATFORM_CONTACT.postalAddress,
            addressLocality: "Nairobi",
            addressCountry: "KE",
          },
        },
        areaServed: {
          "@type": "Country",
          name: "Kenya",
        },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          telephone: KIOSK_PLATFORM_CONTACT.phoneTel,
          email: KIOSK_PLATFORM_CONTACT.email,
          areaServed: "KE",
          availableLanguage: ["English", "Swahili"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: PLATFORM_SITE_NAME,
        description: PLATFORM_DESCRIPTION,
        publisher: { "@id": `${base}/#organization` },
        inLanguage: "en-KE",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${base}/#app`,
        name: "Kiosk POS",
        alternateName: [
          "Kiosk.ke",
          "Kiosk point of sale",
          "POS Kenya",
        ],
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Point of Sale",
        operatingSystem: "Web, Windows, macOS, Android, iOS",
        url: base,
        description: PLATFORM_DESCRIPTION,
        image: `${base}/opengraph-image`,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KES",
          description: "Free plan with 300 products and one cashier",
        },
        featureList: [
          "Barcode point of sale",
          "M-Pesa STK payments",
          "Offline-ready sales",
          "Inventory and stock-takes",
          "Online storefront",
          "Multi-branch management",
          "Cashier shifts and receipts",
        ],
        areaServed: {
          "@type": "Country",
          name: "Kenya",
        },
        provider: { "@id": `${base}/#organization` },
        publisher: { "@id": `${base}/#organization` },
      },
      {
        ...platformFaqJsonLd(),
        "@id": `${base}/#faq`,
        isPartOf: { "@id": `${base}/#website` },
      },
    ],
  };
}

/** Help center hub defaults (titles live in lib/help/seo.ts for page metadata). */
export const HELP_CENTER_PATH = "/help";

export const HELP_CENTER_DESCRIPTION =
  "Kiosk.ke help for shop owners and online shoppers in Kenya — till setup, M-Pesa, inventory, orders, and delivery.";
