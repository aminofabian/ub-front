import localFont from "next/font/local";

export const beautySans = localFont({
  src: [
    {
      path: "../../../../app/fonts/jost/jost-latin-300-normal.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/jost/jost-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/jost/jost-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../app/fonts/jost/jost-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-be-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const beautySerif = localFont({
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
      path: "../../../../app/fonts/cormorant/cormorant-garamond-latin-500-italic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../../../app/fonts/cormorant/cormorant-garamond-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-be-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const beautyEditFontVariables = [beautySans.variable, beautySerif.variable].join(
  " ",
);
