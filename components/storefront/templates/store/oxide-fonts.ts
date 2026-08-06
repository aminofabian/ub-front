import { Anton, JetBrains_Mono, Space_Grotesk } from "next/font/google";

export const oxideDisplay = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-oxide-display",
  display: "swap",
});

export const oxideSans = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-oxide-sans",
  display: "swap",
});

export const oxideMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-oxide-mono",
  display: "swap",
});

export const oxideFontVariables = [
  oxideDisplay.variable,
  oxideSans.variable,
  oxideMono.variable,
].join(" ");
