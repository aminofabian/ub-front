import type { Metadata } from "next";

import { APP_BASE_URL } from "@/lib/config";
import { PLATFORM_SITE_NAME } from "@/lib/platform-seo";

import type { BlogArticle } from "./types";

export function blogSiteUrl(): string {
  return APP_BASE_URL.replace(/\/+$/, "") || "https://kiosk.ke";
}

export function blogAbsoluteUrl(path: string): string {
  const base = blogSiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function blogHubMetadata(): Metadata {
  const title = `POS Kenya Blog — Guides & Rankings | ${PLATFORM_SITE_NAME}`;
  const description =
    "Guides, rankings, and comparisons for shop owners choosing a POS system in Kenya — M-Pesa, eTIMS, inventory, and storefront tips for the counter.";
  const url = blogAbsoluteUrl("/blog");

  return {
    title,
    description,
    keywords: [
      "POS Kenya",
      "POS system Kenya",
      "best POS Kenya",
      "M-Pesa POS",
      "point of sale Kenya",
      "Kiosk blog",
      "kiosk.ke",
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

export function blogArticleMetadata(article: BlogArticle): Metadata {
  const title = `${article.title} | ${PLATFORM_SITE_NAME}`;
  const url = blogAbsoluteUrl(`/blog/${article.slug}`);
  const keywords = [
    ...article.tags,
    ...(article.keywords ?? []),
    "POS Kenya",
    "kiosk.ke",
  ];

  return {
    title,
    description: article.description,
    keywords: [...new Set(keywords)],
    authors: [{ name: article.author }],
    category: article.category,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: article.description,
      url,
      siteName: PLATFORM_SITE_NAME,
      type: "article",
      locale: "en_KE",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      tags: article.tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: article.description,
    },
    robots: {
      index: !article.listedOnly,
      follow: true,
      googleBot: {
        index: !article.listedOnly,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
      },
    },
    other: {
      "geo.region": "KE",
      "content-language": "en-KE",
    },
  };
}
