import localFont from "next/font/local";

/**
 * Self-hosted Instrument Serif so production builds do not call Google Fonts
 * (CI / sandboxed deploys often fail `next/font/google` fetches). Used for the
 * business hub headline. Instrument Serif ships a single 400 weight.
 */
export const instrumentSerif = localFont({
  src: [
    {
      path: "./instrument-serif/instrument-serif-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});
