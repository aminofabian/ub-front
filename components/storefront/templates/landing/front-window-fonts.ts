import localFont from "next/font/local";

export const frontWindowSerif = localFont({
  src: [
    {
      path: "../../../../app/fonts/cormorant/cormorant-garamond-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/cormorant/cormorant-garamond-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../../../app/fonts/cormorant/cormorant-garamond-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/cormorant/cormorant-garamond-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/cormorant/cormorant-garamond-latin-600-italic.woff2",
      weight: "600",
      style: "italic",
    },
  ],
  variable: "--font-fw-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const frontWindowSans = localFont({
  src: [
    {
      path: "../../../../app/fonts/dm-sans/dm-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/dm-sans/dm-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/dm-sans/dm-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/dm-sans/dm-sans-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-fw-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const frontWindowFontVariables = [
  frontWindowSerif.variable,
  frontWindowSans.variable,
].join(" ");
