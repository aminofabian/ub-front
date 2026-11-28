import localFont from "next/font/local";

/**
 * Trial face for the grocery counter only. One regular cut
 * (Georgia-PersonalUse.otf from the grocery app folder).
 *
 * 1001Fonts Free For Personal Use — not licensed for a commercial
 * site or app. Do not ship this file.
 */
export const georgiaTrial = localFont({
  src: "./georgia/Georgia-PersonalUse.otf",
  weight: "400",
  style: "normal",
  variable: "--font-georgia-trial",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});
