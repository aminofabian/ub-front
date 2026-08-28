import localFont from "next/font/local";

/**
 * Pastry case: Jost for the shop floor, Archivo for the frosting shout.
 * Cake-window lettering without calling Google Fonts at runtime.
 */
export const pastryCaseBody = localFont({
  src: [
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
  variable: "--font-pc-body",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const pastryCaseDisplay = localFont({
  src: [
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
  variable: "--font-pc-display",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const pastryCaseFontVariables = [
  pastryCaseBody.variable,
  pastryCaseDisplay.variable,
].join(" ");
