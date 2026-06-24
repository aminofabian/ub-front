import type { MetadataRoute } from "next";

import { APP_BASE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const base = APP_BASE_URL.replace(/\/+$/, "") || "https://kiosk.ke";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/super-admin/",
        "/overview",
        "/login",
        "/signup",
        "/cashier",
        "/grocery",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ""),
  };
}
