import type { MetadataRoute } from "next";

import { allBlogPaths } from "@/lib/blog";
import { APP_BASE_URL } from "@/lib/config";
import { allHelpPaths } from "@/lib/help";
import { searchMarketplaceSuppliers } from "@/lib/marketplace-api";

/** Rebuild at most hourly — the supplier directory changes less often. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = APP_BASE_URL.replace(/\/+$/, "") || "https://kiosk.ke";
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/download`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${base}/barcode`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/migration`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const helpEntries: MetadataRoute.Sitemap = allHelpPaths().map((path) => {
    if (path.type === "hub") {
      return {
        url: `${base}${path.href}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      };
    }
    if (path.type === "audience") {
      return {
        url: `${base}${path.href}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.85,
      };
    }
    if (path.type === "category") {
      return {
        url: `${base}${path.href}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      };
    }
    return {
      url: `${base}${path.href}`,
      lastModified: new Date(path.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    };
  });

  const blogEntries: MetadataRoute.Sitemap = allBlogPaths().map((path) => {
    if (path.type === "hub") {
      return {
        url: `${base}${path.href}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.85,
      };
    }
    return {
      url: `${base}${path.href}`,
      lastModified: new Date(path.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    };
  });

  // Supplier passports: /s/{username}. The passport username is the slug
  // prefix before the "--" id marker ("david-mutuku--e6b93e7d" → "david-mutuku"),
  // which is exactly how /s/{username} resolves the directory entry.
  const supplierEntries: MetadataRoute.Sitemap = [];
  try {
    const page = await searchMarketplaceSuppliers({ page: 0, size: 500 });
    const seen = new Set<string>();
    for (const row of page.content) {
      const username = row.slug?.split("--")[0]?.trim();
      if (!username) continue;
      const key = username.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      supplierEntries.push({
        url: `${base}/s/${encodeURIComponent(username)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }
  } catch {
    // A backend hiccup must never take down the whole sitemap.
  }

  return [...staticEntries, ...helpEntries, ...blogEntries, ...supplierEntries];
}
