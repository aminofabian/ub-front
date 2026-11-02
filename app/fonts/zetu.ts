import localFont from "next/font/local";

/**
 * Self-hosted Zetu faces, matching shopzetu.com:
 * - Archivo (heavy grotesque display — sale numbers, section titles)
 * - Plus Jakarta Sans (friendly geometric body)
 * - Playfair Display italic (editorial asides, e.g. "Gift Cards")
 *
 * Variable files keep the theme to one network request per family. `preload`
 * stays off because only the active storefront theme paints these faces.
 */
export const zetuDisplay = localFont({
  src: [
    {
      path: "./zetu/archivo-var-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-zetu-display",
  display: "swap",
  preload: false,
  fallback: ["Arial Black", "Impact", "sans-serif"],
});

export const zetuBody = localFont({
  src: [
    {
      path: "./zetu/plus-jakarta-sans-var-latin.woff2",
      weight: "200 800",
      style: "normal",
    },
  ],
  variable: "--font-zetu-body",
  display: "swap",
  preload: false,
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const zetuEditorial = localFont({
  src: [
    {
      path: "./zetu/playfair-display-italic-var-latin.woff2",
      weight: "400 900",
      style: "italic",
    },
  ],
  variable: "--font-zetu-editorial",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const zetuFontVariables = [
  zetuDisplay.variable,
  zetuBody.variable,
  zetuEditorial.variable,
].join(" ");
