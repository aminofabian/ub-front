import localFont from "next/font/local";

/** Comilmart display voice — Space Grotesk headlines, matching comilmart.com. */
export const comilmartDisplay = localFont({
  src: [
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
  variable: "--font-cm-display",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

/** Comilmart body — IBM Plex Sans, the live shop's UI face. */
export const comilmartSans = localFont({
  src: [
    {
      path: "../../../../app/fonts/ibm-plex-sans/ibm-plex-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/ibm-plex-sans/ibm-plex-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/ibm-plex-sans/ibm-plex-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/ibm-plex-sans/ibm-plex-sans-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-cm-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

/** Utility bar clock — IBM Plex Mono. */
export const comilmartMono = localFont({
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
  variable: "--font-cm-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const comilmartFontVariables = [
  comilmartDisplay.variable,
  comilmartSans.variable,
  comilmartMono.variable,
].join(" ");
