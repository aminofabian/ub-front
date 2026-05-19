import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BarcodePlatformPage } from "@/components/storefront/barcode-platform-page";
import { APP_BASE_URL } from "@/lib/config";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

// ── SEO constants ──────────────────────────────────────────────────────────

const TITLE = "Free Barcode Lookup — GTIN, UPC & EAN Scanner | Kiosk";
const DESCRIPTION =
  "Look up any barcode instantly — type or scan GTIN, UPC, EAN-13, or retail codes. Free product lookup with prices, stock, and details. No sign-up required.";
const KEYWORDS = [
  "barcode lookup",
  "free barcode lookup",
  "GTIN lookup",
  "UPC lookup",
  "EAN lookup",
  "EAN-13 lookup",
  "barcode scanner",
  "product barcode search",
  "retail barcode",
  "scan barcode online",
  "barcode number search",
  "product code lookup",
  "barcode price check",
  "SKU lookup",
  "POS barcode",
];

// ── JSON‑LD structured data ────────────────────────────────────────────────

function barcodeJsonLd(canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Kiosk Barcode Lookup",
    url: canonical,
    description: DESCRIPTION,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    browserRequirements: "Requires a camera for barcode scanning",
    featureList: [
      "GTIN / UPC / EAN-13 barcode lookup",
      "Camera-based barcode scanning",
      "Manual barcode number entry",
      "Product details, price, and stock",
      "No sign-up or app install required",
    ],
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
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
    },
    other: {
      "application-name": "Kiosk Barcode Lookup",
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
      <BarcodePlatformPage />
    </>
  );
}
