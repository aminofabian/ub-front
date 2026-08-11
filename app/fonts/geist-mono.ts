import localFont from "next/font/local";

/**
 * Self-hosted Geist Mono so production builds do not call Google Fonts
 * (CI / sandboxed deploys often fail `next/font/google` fetches).
 */
export const geistMono = localFont({
  src: [
    {
      path: "./geist-mono/geist-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./geist-mono/geist-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./geist-mono/geist-mono-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});
