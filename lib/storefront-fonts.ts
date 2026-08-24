import localFont from "next/font/local";

import { cormorant } from "@/app/fonts/cormorant";
import { dmSans } from "@/app/fonts/dm-sans";

/**
 * Storefront font pairings — the merchant's "voice" layer, independent of the
 * theme. Every pairing is a display font (headlines) + a body font (running
 * text). Themes keep their own instrument fonts (mono labels, logo marks);
 * the pairing takes over headings and body copy wherever it is applied.
 *
 * All fonts are self-hosted (no Google Fonts network calls at build or
 * runtime), matching the project's existing font modules.
 */

const anton = localFont({
  src: [{ path: "../app/fonts/anton/anton-latin-400-normal.woff2", weight: "400", style: "normal" }],
  variable: "--sf-font-anton",
  display: "swap",
  fallback: ["Arial Black", "Impact", "sans-serif"],
});

const fraunces = localFont({
  src: [
    { path: "../app/fonts/fraunces/fraunces-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/fraunces/fraunces-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../app/fonts/fraunces/fraunces-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../app/fonts/fraunces/fraunces-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
  variable: "--sf-font-fraunces",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const baloo = localFont({
  src: [
    { path: "../app/fonts/baloo-2/baloo-2-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/baloo-2/baloo-2-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../app/fonts/baloo-2/baloo-2-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--sf-font-baloo",
  display: "swap",
  fallback: ["Verdana", "sans-serif"],
});

const spaceGrotesk = localFont({
  src: [
    { path: "../app/fonts/space-grotesk/space-grotesk-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/space-grotesk/space-grotesk-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/space-grotesk/space-grotesk-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--sf-font-space-grotesk",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

const passionOne = localFont({
  src: [
    { path: "../app/fonts/passion-one/passion-one-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/passion-one/passion-one-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../app/fonts/passion-one/passion-one-latin-900-normal.woff2", weight: "900", style: "normal" },
  ],
  variable: "--sf-font-passion",
  display: "swap",
  fallback: ["Arial Black", "Impact", "sans-serif"],
});

const jost = localFont({
  src: [
    { path: "../app/fonts/jost/jost-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "../app/fonts/jost/jost-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/jost/jost-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/jost/jost-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--sf-font-jost",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

const manrope = localFont({
  src: [
    { path: "../app/fonts/manrope/manrope-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/manrope/manrope-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/manrope/manrope-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../app/fonts/manrope/manrope-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--sf-font-manrope",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

const archivo = localFont({
  src: [
    { path: "../app/fonts/archivo/archivo-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/archivo/archivo-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/archivo/archivo-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--sf-font-archivo",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

type FontFace = { style: { fontFamily: string }; variable: string };

export type StorefrontFontPairingId =
  | "default"
  | "classic"
  | "heritage"
  | "playful"
  | "elegant"
  | "modern"
  | "loud"
  | "clean";

export type StorefrontFontPairing = {
  id: StorefrontFontPairingId;
  name: string;
  /** One-line feel description shown in the picker. */
  vibe: string;
  display: FontFace | null;
  body: FontFace | null;
  /** Class string that loads both faces (empty for the theme default). */
  variables: string;
};

export const STOREFRONT_FONT_PAIRING_IDS: readonly StorefrontFontPairingId[] = [
  "default",
  "classic",
  "heritage",
  "playful",
  "elegant",
  "modern",
  "loud",
  "clean",
] as const;

export const STOREFRONT_FONT_PAIRINGS: readonly StorefrontFontPairing[] = [
  {
    id: "default",
    name: "Theme's own voice",
    vibe: "Each theme keeps its signature lettering",
    display: null,
    body: null,
    variables: "",
  },
  {
    id: "classic",
    name: "Market Classic",
    vibe: "Tall bold capitals with a clean everyday body",
    display: anton,
    body: dmSans,
    variables: [anton.variable, dmSans.variable].join(" "),
  },
  {
    id: "heritage",
    name: "Heritage",
    vibe: "Editorial serif headlines over a friendly sans",
    display: fraunces,
    body: dmSans,
    variables: [fraunces.variable, dmSans.variable].join(" "),
  },
  {
    id: "playful",
    name: "Playful",
    vibe: "Rounded, chubby headlines that feel like a corner shop",
    display: baloo,
    body: dmSans,
    variables: [baloo.variable, dmSans.variable].join(" "),
  },
  {
    id: "elegant",
    name: "Elegant",
    vibe: "Refined high-contrast serif with a quiet geometric body",
    display: cormorant,
    body: jost,
    variables: [cormorant.variable, jost.variable].join(" "),
  },
  {
    id: "modern",
    name: "Modern",
    vibe: "Technical grotesque with a clean professional body",
    display: spaceGrotesk,
    body: manrope,
    variables: [spaceGrotesk.variable, manrope.variable].join(" "),
  },
  {
    id: "loud",
    name: "Loud",
    vibe: "Heavy condensed capitals with a sturdy working body",
    display: passionOne,
    body: archivo,
    variables: [passionOne.variable, archivo.variable].join(" "),
  },
  {
    id: "clean",
    name: "Clean",
    vibe: "Quiet geometric display, light and modern body",
    display: jost,
    body: manrope,
    variables: [jost.variable, manrope.variable].join(" "),
  },
];

export function isStorefrontFontPairingId(
  value: unknown,
): value is StorefrontFontPairingId {
  return (
    typeof value === "string" &&
    (STOREFRONT_FONT_PAIRING_IDS as readonly string[]).includes(value)
  );
}

export function storefrontFontPairing(
  id: string | null | undefined,
): StorefrontFontPairing {
  return (
    STOREFRONT_FONT_PAIRINGS.find((p) => p.id === id) ??
    STOREFRONT_FONT_PAIRINGS[0]!
  );
}
