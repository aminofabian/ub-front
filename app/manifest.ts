import type { MetadataRoute } from "next";

import { PLATFORM_APP_ICON_SRC } from "@/lib/platform-brand-assets";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  SHOPPER_PWA_START_UTM,
  shopperPwaIconPath,
  shopperPwaId,
  shopperPwaShortName,
} from "@/lib/shopper-pwa";
import { resolveTenantContext } from "@/lib/storefront-slug";
import { parseStorefrontHex } from "@/lib/storefront-theme";

const THEME_COLOR = "#28A745";
const BACKGROUND_COLOR = "#fafafa";

/**
 * Do not export `dynamic` here. Next.js requires that value to be a string
 * literal, so `IS_DESKTOP ? "force-static" : "force-dynamic"` fails the build.
 * Cloud requests call `headers()` via {@link resolveTenantContext} and render
 * dynamically; desktop builds inline `IS_DESKTOP` and return the platform
 * manifest without touching headers, which keeps `output: "export"` static.
 */

function platformManifest(): MetadataRoute.Manifest {
  return {
    name: "Kiosk POS — Point of Sale & Storefront",
    short_name: "Kiosk",
    description:
      "Run your Kenyan shop on Kiosk.ke — barcode POS, M-Pesa at the counter, offline sales when the network drops, and an online storefront. Free to start.",
    start_url: "/cashier",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    categories: ["business", "productivity", "shopping"],
    screenshots: [],
    icons: [
      {
        src: PLATFORM_APP_ICON_SRC,
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: PLATFORM_APP_ICON_SRC,
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  if (IS_DESKTOP) {
    return platformManifest();
  }

  const tenant = await resolveTenantContext();
  const slug = tenant?.slug?.trim();
  if (!tenant || !slug) {
    return platformManifest();
  }

  const name =
    tenant.branding.displayName?.trim() ||
    tenant.tenantName.trim() ||
    slug;
  const theme = parseStorefrontHex(tenant.branding.primaryColor) || THEME_COLOR;

  return {
    name,
    short_name: shopperPwaShortName(name),
    description: `Browse and order from ${name}.`,
    start_url: SHOPPER_PWA_START_UTM,
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f4f5f4",
    theme_color: theme,
    categories: ["shopping"],
    id: shopperPwaId(slug),
    icons: [
      {
        src: shopperPwaIconPath(slug, 192),
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: shopperPwaIconPath(slug, 512),
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: shopperPwaIconPath(slug, 512, "maskable"),
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}
