import { Fraunces, IBM_Plex_Mono, Manrope } from "next/font/google";

export const tintSerif = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-tint-serif",
  display: "swap",
});

export const tintSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-tint-sans",
  display: "swap",
});

export const tintMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-tint-mono",
  display: "swap",
});

export const tintFontVariables = [
  tintSerif.variable,
  tintSans.variable,
  tintMono.variable,
].join(" ");
