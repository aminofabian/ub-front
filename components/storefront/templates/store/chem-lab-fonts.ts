import localFont from "next/font/local";

export const chemDisplay = localFont({
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
  variable: "--font-cl-display",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const chemMono = localFont({
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
  variable: "--font-cl-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const chemLabFontVariables = [chemDisplay.variable, chemMono.variable].join(
  " ",
);
