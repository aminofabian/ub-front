import localFont from "next/font/local";

/**
 * Daily gazette — condensed headline sans + editorial serif masthead.
 * Barlow Condensed carries the "ANNOUNCING" billing; Cormorant is the nameplate.
 */
export const gazetteDisplay = localFont({
  src: [
    {
      path: "../../../../app/fonts/barlow-condensed/barlow-condensed-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/barlow-condensed/barlow-condensed-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/barlow-condensed/barlow-condensed-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/barlow-condensed/barlow-condensed-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/barlow-condensed/barlow-condensed-latin-900-normal.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-dg-display",
  display: "swap",
  fallback: ["Oswald", "Arial Narrow", "Impact", "sans-serif"],
});

export const gazetteSerif = localFont({
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
    {
      path: "../../../../app/fonts/cormorant/cormorant-garamond-latin-600-italic.woff2",
      weight: "600",
      style: "italic",
    },
  ],
  variable: "--font-dg-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const gazetteSans = localFont({
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
  variable: "--font-dg-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const dailyGazetteFontVariables = [
  gazetteDisplay.variable,
  gazetteSerif.variable,
  gazetteSans.variable,
].join(" ");
