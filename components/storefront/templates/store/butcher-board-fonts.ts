import localFont from "next/font/local";

/**
 * Self-hosted Butcher board fonts so production builds do not call Google Fonts.
 */
export const butcherDisplay = localFont({
  src: [
    {
      path: "../../../../app/fonts/passion-one/passion-one-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/passion-one/passion-one-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/passion-one/passion-one-latin-900-normal.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-bb-display",
  display: "swap",
  fallback: ["Impact", "Haettenschweiler", "sans-serif"],
});

export const butcherSans = localFont({
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
  variable: "--font-bb-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const butcherBoardFontVariables = [
  butcherDisplay.variable,
  butcherSans.variable,
].join(" ");
