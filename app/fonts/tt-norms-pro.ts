import localFont from "next/font/local";

/**
 * TT Norms Pro — site body / UI voice.
 *
 * Variable cut covers Thin→ExtraBlack. Kept under `app/fonts/` (bundled by
 * next/font) rather than `/public`, so the licensed files are not downloadable
 * as static assets. The full family dump stays out of the deploy image.
 */
export const ttNormsPro = localFont({
  src: [
    {
      path: "./tt-norms-pro/TTNormsProVariable.ttf",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-tt-norms",
  display: "swap",
  fallback: [
    "Avenir Next",
    "Segoe UI",
    "Helvetica Neue",
    "system-ui",
    "sans-serif",
  ],
});

/** Tabular / receipt companion — optional; Geist Mono remains the default mono. */
export const ttNormsProMono = localFont({
  src: [
    {
      path: "./tt-norms-pro/TTNormsProMonoVariable.ttf",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-tt-norms-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});
