import type { MetadataRoute } from "next";

import { allBlogPaths } from "@/lib/blog";
import { APP_BASE_URL } from "@/lib/config";
import { allHelpPaths } from "@/lib/help";

export default function sitemap(): MetadataRoute.Sitemap {
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
      url: `${base}/barcode`,
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

  return [...staticEntries, ...helpEntries, ...blogEntries];
}
