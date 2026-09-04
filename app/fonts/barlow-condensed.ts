import localFont from "next/font/local";

/**
 * Self-hosted Barlow Condensed (display) — same stack as freekick.lol.
 * Avoids Google Fonts fetches in CI / sandboxed deploys.
 */
export const barlowCondensed = localFont({
  src: [
    {
      path: "./barlow-condensed/barlow-condensed-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./barlow-condensed/barlow-condensed-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./barlow-condensed/barlow-condensed-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./barlow-condensed/barlow-condensed-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "./barlow-condensed/barlow-condensed-latin-900-normal.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
  fallback: ["Oswald", "Arial Narrow", "Impact", "sans-serif"],
});
