import type { MetadataRoute } from "next";

const THEME_COLOR = "#28A745";
const BACKGROUND_COLOR = "#fafafa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UB Cashier",
    short_name: "UB POS",
    description: "Offline-capable quick sale for Universal Business.",
    start_url: "/cashier",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
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
