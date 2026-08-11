import localFont from "next/font/local";

/**
 * Self-hosted Milk Run template fonts so production builds do not call Google Fonts
 * (CI / sandboxed deploys often fail `next/font/google` fetches).
 */
export const milkRunDisplay = localFont({
  src: [
    {
      path: "../../../../app/fonts/baloo-2/baloo-2-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/baloo-2/baloo-2-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/baloo-2/baloo-2-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-milk-display",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const milkRunSans = localFont({
  src: [
    {
      path: "../../../../app/fonts/dm-sans/dm-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/dm-sans/dm-sans-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../../../app/fonts/dm-sans/dm-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/dm-sans/dm-sans-latin-500-italic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../../../app/fonts/dm-sans/dm-sans-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/dm-sans/dm-sans-latin-700-italic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-milk-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const milkRunMono = localFont({
  src: [
    {
      path: "../../../../app/fonts/space-mono/space-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/space-mono/space-mono-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-milk-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const milkRunFontVariables = [
  milkRunDisplay.variable,
  milkRunSans.variable,
  milkRunMono.variable,
].join(" ");
