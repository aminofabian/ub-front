import { Baloo_2, DM_Sans, Space_Mono } from "next/font/google";

export const milkRunDisplay = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-milk-display",
  display: "swap",
});

export const milkRunSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-milk-sans",
  display: "swap",
});

export const milkRunMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-milk-mono",
  display: "swap",
});

export const milkRunFontVariables = [
  milkRunDisplay.variable,
  milkRunSans.variable,
  milkRunMono.variable,
].join(" ");
