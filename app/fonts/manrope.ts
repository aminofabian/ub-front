import localFont from "next/font/local";

/**
 * Self-hosted Manrope (body) — a contemporary grotesk with open apertures and
 * generous counters. Pairs with Cormorant Garamond for the platform voice.
 */
export const manrope = localFont({
  src: [
    {
      path: "./manrope/manrope-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./manrope/manrope-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./manrope/manrope-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./manrope/manrope-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-manrope",
  display: "swap",
  fallback: ["Avenir Next", "Segoe UI", "system-ui", "sans-serif"],
});
