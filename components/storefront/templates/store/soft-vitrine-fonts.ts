import localFont from "next/font/local";

export const softVitrineSans = localFont({
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
  variable: "--font-sv-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const softVitrineSerif = localFont({
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
  variable: "--font-sv-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const softVitrineFontVariables = [softVitrineSans.variable, softVitrineSerif.variable].join(
  " ",
);
