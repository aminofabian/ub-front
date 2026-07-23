import type { Metadata } from "next";

import { APP_BASE_URL } from "@/lib/config";
import { PLATFORM_SITE_NAME } from "@/lib/platform-seo";

export function blogSiteUrl(): string {
  return APP_BASE_URL.replace(/\/+$/, "") || "https://kiosk.ke";
}

export function blogAbsoluteUrl(path: string): string {
  const base = blogSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function blogHubMetadata(): Metadata {
  const title = `Blog — Retail POS Insights | ${PLATFORM_SITE_NAME}`;
  const description =
    "Guides and comparisons for shop owners choosing POS, inventory, and storefront tools in Kenya — built for counters that move fast.";
  const url = blogAbsoluteUrl("/blog");

  return {
    title,
    description,
    keywords: [
      "Kiosk blog",
      "POS Kenya",
      "retail POS comparison",
      "kiosk.ke",
      "point of sale Kenya",
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

export function blogArticleMetadata(opts: {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
}): Metadata {
  const title = `${opts.title} | ${PLATFORM_SITE_NAME} Blog`;
  const url = blogAbsoluteUrl(`/blog/${opts.slug}`);

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
      publishedTime: opts.publishedAt,
      modifiedTime: opts.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: opts.description,
    },
    robots: { index: true, follow: true },
  };
}
