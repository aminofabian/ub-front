import localFont from "next/font/local";

/**
 * Self-hosted Tint Lab template fonts so production builds do not call Google Fonts
 * (CI / sandboxed deploys often fail `next/font/google` fetches).
 */
export const tintSerif = localFont({
  src: [
    {
      path: "../../../../app/fonts/fraunces/fraunces-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/fraunces/fraunces-latin-500-italic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../../../app/fonts/fraunces/fraunces-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/fraunces/fraunces-latin-600-italic.woff2",
      weight: "600",
      style: "italic",
    },
  ],
  variable: "--font-tint-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const tintSans = localFont({
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
  variable: "--font-tint-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const tintMono = localFont({
  src: [
    {
      path: "../../../../app/fonts/ibm-plex-mono/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/ibm-plex-mono/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-tint-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const tintFontVariables = [
  tintSerif.variable,
  tintSans.variable,
  tintMono.variable,
].join(" ");
