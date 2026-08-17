import localFont from "next/font/local";

/**
 * Self-hosted Carbon desk fonts so production builds do not call Google Fonts.
 */
export const carbonDisplay = localFont({
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
  variable: "--font-cd-display",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const carbonMono = localFont({
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
  variable: "--font-cd-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const carbonDeskFontVariables = [carbonDisplay.variable, carbonMono.variable].join(
  " ",
);
