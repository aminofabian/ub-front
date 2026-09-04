import localFont from "next/font/local";

/**
 * Self-hosted Inter (UI) — same interface stack as freekick.lol.
 * Avoids Google Fonts fetches in CI / sandboxed deploys.
 */
export const inter = localFont({
  src: [
    {
      path: "./inter/inter-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./inter/inter-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./inter/inter-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./inter/inter-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["IBM Plex Sans", "system-ui", "Segoe UI", "sans-serif"],
});
