import localFont from "next/font/local";

/**
 * Self-hosted DM Sans so production builds do not call Google Fonts
 * (CI / sandboxed deploys often fail `next/font/google` fetches).
 */
export const dmSans = localFont({
  src: [
    {
      path: "./dm-sans/dm-sans-latin-300-normal.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./dm-sans/dm-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./dm-sans/dm-sans-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "./dm-sans/dm-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./dm-sans/dm-sans-latin-500-italic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "./dm-sans/dm-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./dm-sans/dm-sans-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./dm-sans/dm-sans-latin-700-italic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-dm-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});
