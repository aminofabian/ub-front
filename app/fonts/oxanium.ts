import localFont from "next/font/local";

/**
 * Self-hosted Oxanium — used on business, butcher, dashboard, and super-admin.
 * Avoids Google Fonts fetches in CI / sandboxed deploys.
 */
export const oxanium = localFont({
  src: [
    {
      path: "./oxanium/oxanium-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./oxanium/oxanium-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./oxanium/oxanium-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./oxanium/oxanium-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./oxanium/oxanium-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-oxanium",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});
