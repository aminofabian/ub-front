import localFont from "next/font/local";

/**
 * Self-hosted Oxide template fonts so production builds do not call Google Fonts
 * (CI / sandboxed deploys often fail `next/font/google` fetches).
 */
export const oxideDisplay = localFont({
  src: [
    {
      path: "../../../../app/fonts/anton/anton-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-oxide-display",
  display: "swap",
  fallback: ["Impact", "Haettenschweiler", "sans-serif"],
});

export const oxideSans = localFont({
  src: [
    {
      path: "../../../../app/fonts/space-grotesk/space-grotesk-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/space-grotesk/space-grotesk-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/space-grotesk/space-grotesk-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-oxide-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const oxideMono = localFont({
  src: [
    {
      path: "../../../../app/fonts/jetbrains-mono/jetbrains-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/jetbrains-mono/jetbrains-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/jetbrains-mono/jetbrains-mono-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-oxide-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const oxideFontVariables = [
  oxideDisplay.variable,
  oxideSans.variable,
  oxideMono.variable,
].join(" ");
