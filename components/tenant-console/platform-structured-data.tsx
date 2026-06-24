import { APP_BASE_URL } from "@/lib/config";
import { platformOrganizationJsonLd } from "@/lib/platform-seo";

/** JSON-LD for kiosk.ke marketing home (no tenant on host). */
export function PlatformStructuredData() {
  const siteUrl = APP_BASE_URL.replace(/\/+$/, "") || "https://kiosk.ke";
  const jsonLd = platformOrganizationJsonLd(siteUrl);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
