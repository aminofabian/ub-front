import localFont from "next/font/local";

/**
 * Plus Jakarta Sans — the face on the super-admin frame.
 * Latin subset, SIL Open Font License. Self-hosted so deploys do not fetch Google.
 */
export const plusJakarta = localFont({
  src: [
    {
      path: "./plus-jakarta/plus-jakarta-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./plus-jakarta/plus-jakarta-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./plus-jakarta/plus-jakarta-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./plus-jakarta/plus-jakarta-sans-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-plus-jakarta",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const PLUS_JAKARTA_STACK =
  'var(--font-plus-jakarta), "Plus Jakarta Sans", system-ui, "Segoe UI", sans-serif';
