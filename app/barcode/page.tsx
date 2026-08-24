import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BarcodePlatformPage } from "@/components/storefront/barcode-platform-page";
import { APP_BASE_URL } from "@/lib/config";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

// ── SEO constants ──────────────────────────────────────────────────────────

const TITLE =
  "Barcode Lookup Kenya — Free Product Search by Barcode or Name | Kiosk";
const DESCRIPTION =
  "Look up any product in Kenya by barcode or name — EAN-13, UPC, GTIN. Free barcode scanner with prices in KES and stock across Kiosk stores. No sign-up required.";
const KEYWORDS = [
  "barcode lookup Kenya",
  "barcode search Kenya",
  "barcode lookup",
  "free barcode lookup",
  "GTIN lookup",
  "UPC lookup",
  "EAN lookup",
  "EAN-13 lookup",
  "barcode scanner",
  "product barcode search",
  "product search by name",
  "check product price by barcode",
  "scan barcode online",
  "barcode number search",
  "product code lookup",
  "barcode price check",
  "SKU lookup",
  "product name search",
  "find product barcode",
  "POS barcode",
  "GS1 Kenya",
  "EAN-13 Kenya",
];

const FAQS = [
  {
    question: "How do I look up a barcode in Kenya?",
    answer:
      "Type the barcode digits into the search box, or scan them with your phone camera. Kiosk.ke matches the number against its product catalogue and shows the product name, typical price in KES, and stock availability. Free to use, no sign-up required.",
  },
  {
    question: "What barcode formats can I search?",
    answer:
      "The search accepts EAN-13 (the most common on Kenyan shelves), UPC-A, EAN-8, and GTIN codes. If you don't have a barcode, just type a product name — the same box searches by name too.",
  },
  {
    question: "Can I check a product's price with its barcode?",
    answer:
      "Yes. A lookup shows a typical selling price in Kenyan shillings and whether the product is in stock at Kiosk-powered stores, so you can compare prices before you pay.",
  },
  {
    question: "Do products in Kenya have barcodes?",
    answer:
      "Most packaged goods sold in Kenya carry EAN-13 barcodes, with 616 as the GS1 country prefix for Kenya. Unpackaged or informally produced goods often don't — for those, search by product name instead.",
  },
  {
    question: "What if my barcode doesn't show a result?",
    answer:
      "Try the product name search instead. If you run a shop on Kiosk POS, you can add the product to your own catalog so it resolves for you and your customers next time.",
  },
  {
    question: "Is barcode lookup really free?",
    answer:
      "Yes — free to use, no sign-up, and no app install. Point your camera or type a number and search across all Kiosk-powered stores.",
  },
];

// ── JSON‑LD structured data ────────────────────────────────────────────────

function barcodeJsonLd(canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Kiosk Barcode Lookup & Product Search",
    url: canonical,
    description: DESCRIPTION,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KES",
    },
    browserRequirements: "Requires a camera for barcode scanning",
    featureList: [
      "GTIN / UPC / EAN-13 barcode lookup",
      "Camera-based barcode scanning",
      "Manual barcode number entry",
      "Product name search across all stores",
      "Copyable barcodes in search results",
      "Product details, price in KES, and store info",
      "No sign-up or app install required",
    ],
  };
}

function barcodeFaqJsonLd(canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
    url: canonical,
  };
}

// ── generateMetadata ───────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const base = APP_BASE_URL.replace(/\/+$/, "");
  const canonical = `${base}/barcode`;

  return {
    title: TITLE,
    description: DESCRIPTION,
    keywords: KEYWORDS,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
    openGraph: {
      type: "website",
      title: TITLE,
      description: DESCRIPTION,
      url: canonical,
      siteName: "Kiosk",
      locale: "en_KE",
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
    },
    other: {
      "application-name": "Kiosk Barcode Lookup",
      "geo.region": "KE",
      "content-language": "en-KE",
    },
  };
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function BarcodePage() {
  const base = APP_BASE_URL.replace(/\/+$/, "");
  const canonical = `${base}/barcode`;
  const slug = await resolveStorefrontSlug();

  // Host-only — redirect tenant visitors to the storefront home.
  if (slug) {
    redirect("/shop");
  }

  return (
    <>
      {/* JSON‑LD structured data for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(barcodeJsonLd(canonical)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(barcodeFaqJsonLd(canonical)),
        }}
      />
      <BarcodePlatformPage />
    </>
  );
}
