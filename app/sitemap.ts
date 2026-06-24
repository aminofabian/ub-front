import type { MetadataRoute } from "next";

import { APP_BASE_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = APP_BASE_URL.replace(/\/+$/, "") || "https://kiosk.ke";
  const now = new Date();

  return [
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
}
