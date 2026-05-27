import type { MetadataRoute } from "next";

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
      "All-in-one POS with storefront, cashier counter, barcode scanning, and inventory management. Ring up sales, manage stock, and run your store — online and in-person.",
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
        src: "/cashier-icon.svg",
        type: "image/svg+xml",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: "/cashier-icon.svg",
        type: "image/svg+xml",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}
