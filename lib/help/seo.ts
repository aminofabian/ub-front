import type { Metadata } from "next";

import type { HelpAudience } from "@/lib/help";
import { audienceLabel } from "@/lib/help";
import { APP_BASE_URL } from "@/lib/config";
import { PLATFORM_SITE_NAME } from "@/lib/platform-seo";

export function helpSiteUrl(): string {
  return APP_BASE_URL.replace(/\/+$/, "") || "https://kiosk.ke";
}

export function helpAbsoluteUrl(path: string): string {
  const base = helpSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function helpHubMetadata(): Metadata {
  const title = `Help Center — ${PLATFORM_SITE_NAME} POS & Storefront Support`;
  const description =
    "Kiosk help for shop owners and online shoppers in Kenya — set up your till, take M-Pesa, manage stock, place orders, and track delivery.";
  const url = helpAbsoluteUrl("/help");

  return {
    title,
    description,
    keywords: [
      "Kiosk help",
      "POS Kenya help",
      "M-Pesa STK",
      "kiosk.ke support",
      "online shop help",
    ],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: PLATFORM_SITE_NAME,
      type: "website",
      locale: "en_KE",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export function helpAudienceMetadata(audience: HelpAudience): Metadata {
  const label = audienceLabel(audience);
  const title =
    audience === "merchants"
      ? `Merchant Help — POS, M-Pesa & Inventory | ${PLATFORM_SITE_NAME}`
      : `Shopper Help — Orders, Delivery & Payments | ${PLATFORM_SITE_NAME}`;
  const description =
    audience === "merchants"
      ? "Guides for Kiosk shop owners and staff: create your shop, run the cashier, accept M-Pesa, manage inventory, and grow your storefront."
      : "Help for customers ordering on kiosk.ke shops: accounts, checkout, M-Pesa payments, delivery, and returns.";
  const url = helpAbsoluteUrl(`/help/${audience}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: PLATFORM_SITE_NAME,
      type: "website",
      locale: "en_KE",
    },
    twitter: { card: "summary", title, description },
    robots: { index: true, follow: true },
    other: {
      "help:audience": label,
    },
  };
}

export function helpCategoryMetadata(opts: {
  audience: HelpAudience;
  categoryTitle: string;
  categoryDescription: string;
  categorySlug: string;
}): Metadata {
  const title = `${opts.categoryTitle} — ${audienceLabel(opts.audience)} Help | ${PLATFORM_SITE_NAME}`;
  const description = opts.categoryDescription;
  const url = helpAbsoluteUrl(
    `/help/${opts.audience}/${opts.categorySlug}`,
  );

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: PLATFORM_SITE_NAME,
      type: "website",
      locale: "en_KE",
    },
    robots: { index: true, follow: true },
  };
}

export function helpArticleMetadata(opts: {
  audience: HelpAudience;
  categorySlug: string;
  slug: string;
  title: string;
  description: string;
  updatedAt: string;
}): Metadata {
  const title = `${opts.title} | ${PLATFORM_SITE_NAME} Help`;
  const url = helpAbsoluteUrl(
    `/help/${opts.audience}/${opts.categorySlug}/${opts.slug}`,
  );

  return {
    title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: opts.description,
      url,
      siteName: PLATFORM_SITE_NAME,
      type: "article",
      locale: "en_KE",
      modifiedTime: opts.updatedAt,
    },
    twitter: {
      card: "summary",
      title,
      description: opts.description,
    },
    robots: { index: true, follow: true },
  };
}
