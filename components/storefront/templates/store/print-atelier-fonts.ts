import localFont from "next/font/local";

/**
 * Print atelier — Jost UI + Cormorant product titles.
 * Matches a clean Shopify gift gallery without runtime Google Fonts.
 */
export const printAtelierSans = localFont({
  src: [
    {
      path: "../../../../app/fonts/jost/jost-latin-300-normal.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/jost/jost-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/jost/jost-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/jost/jost-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-pa-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const printAtelierSerif = localFont({
  src: [
    {
      path: "../../../../app/fonts/cormorant/cormorant-garamond-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/cormorant/cormorant-garamond-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../../../app/fonts/cormorant/cormorant-garamond-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/cormorant/cormorant-garamond-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-pa-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const printAtelierFontVariables = [
  printAtelierSans.variable,
  printAtelierSerif.variable,
].join(" ");
