import localFont from "next/font/local";

/**
 * Self-hosted Scent story fonts — Archivo display + Manrope body.
 * Matches a luxury fragrance house without calling Google Fonts at runtime.
 */
export const scentStoryDisplay = localFont({
  src: [
    {
      path: "../../../../app/fonts/archivo/archivo-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/archivo/archivo-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/archivo/archivo-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ss-display",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const scentStoryBody = localFont({
  src: [
    {
      path: "../../../../app/fonts/manrope/manrope-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/manrope/manrope-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/manrope/manrope-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/manrope/manrope-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ss-body",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const scentStoryFontVariables = [
  scentStoryDisplay.variable,
  scentStoryBody.variable,
].join(" ");
