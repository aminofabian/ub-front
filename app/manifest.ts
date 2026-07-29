import type { MetadataRoute } from "next";

import { PLATFORM_APP_ICON_SRC } from "@/lib/platform-brand-assets";

const THEME_COLOR = "#28A745";
const BACKGROUND_COLOR = "#fafafa";

// The manifest body is a pure constant — no `headers()`, no fetches — so
// telling Next to treat it as a static asset both unlocks `output: 'export'`
// for the desktop SKU and lets cloud CDNs cache it.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
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
