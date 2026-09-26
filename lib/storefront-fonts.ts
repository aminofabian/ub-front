import localFont from "next/font/local";

import { cormorant } from "@/app/fonts/cormorant";
import { dmSans } from "@/app/fonts/dm-sans";
import {
  STOREFRONT_FONT_PAIRING_IDS,
  STOREFRONT_FONT_PAIRING_META,
  isStorefrontFontPairingId,
  storefrontFontPairingMeta,
  type StorefrontFontPairingId,
  type StorefrontFontPairingMeta,
} from "@/lib/storefront-font-pairings-meta";

/**
 * Storefront font pairings — loads `@font-face` via next/font.
 *
 * Import this only from storefront chrome / the design studio. For ids, vibes,
 * and theme CSS stacks use {@link ./storefront-font-pairings-meta} so cashier
 * and other ops routes do not download every pairing face.
 */

export type {
  StorefrontFontPairingId,
  StorefrontFontPairingMeta,
};
export {
  STOREFRONT_FONT_PAIRING_IDS,
  STOREFRONT_FONT_PAIRING_META,
  isStorefrontFontPairingId,
  storefrontFontPairingMeta,
};

const anton = localFont({
  src: [
    {
      path: "../app/fonts/anton/anton-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--sf-font-anton",
  display: "swap",
  fallback: ["Arial Black", "Impact", "sans-serif"],
});

const fraunces = localFont({
  src: [
    {
      path: "../app/fonts/fraunces/fraunces-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../app/fonts/fraunces/fraunces-latin-500-italic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../app/fonts/fraunces/fraunces-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../app/fonts/fraunces/fraunces-latin-600-italic.woff2",
      weight: "600",
      style: "italic",
    },
  ],
  variable: "--sf-font-fraunces",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const baloo = localFont({
  src: [
    {
      path: "../app/fonts/baloo-2/baloo-2-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../app/fonts/baloo-2/baloo-2-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../app/fonts/baloo-2/baloo-2-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--sf-font-baloo",
  display: "swap",
  fallback: ["Verdana", "sans-serif"],
});

const spaceGrotesk = localFont({
  src: [
    {
      path: "../app/fonts/space-grotesk/space-grotesk-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../app/fonts/space-grotesk/space-grotesk-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../app/fonts/space-grotesk/space-grotesk-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--sf-font-space-grotesk",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

const passionOne = localFont({
  src: [
    {
      path: "../app/fonts/passion-one/passion-one-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../app/fonts/passion-one/passion-one-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../app/fonts/passion-one/passion-one-latin-900-normal.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--sf-font-passion",
  display: "swap",
  fallback: ["Arial Black", "Impact", "sans-serif"],
});

const jost = localFont({
  src: [
    {
      path: "../app/fonts/jost/jost-latin-300-normal.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../app/fonts/jost/jost-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../app/fonts/jost/jost-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../app/fonts/jost/jost-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--sf-font-jost",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

const manrope = localFont({
  src: [
    {
      path: "../app/fonts/manrope/manrope-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../app/fonts/manrope/manrope-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../app/fonts/manrope/manrope-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../app/fonts/manrope/manrope-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--sf-font-manrope",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

const archivo = localFont({
  src: [
    {
      path: "../app/fonts/archivo/archivo-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../app/fonts/archivo/archivo-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../app/fonts/archivo/archivo-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--sf-font-archivo",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

type FontFace = { style: { fontFamily: string }; variable: string };

export type StorefrontFontPairing = StorefrontFontPairingMeta & {
  display: FontFace | null;
  body: FontFace | null;
  /** Class string that loads both faces (empty for the theme default). */
  variables: string;
};

const FACES: Record<
  Exclude<StorefrontFontPairingId, "default">,
  { display: FontFace; body: FontFace; variables: string }
> = {
  classic: {
    display: anton,
    body: dmSans,
    variables: [anton.variable, dmSans.variable].join(" "),
  },
  heritage: {
    display: fraunces,
    body: dmSans,
    variables: [fraunces.variable, dmSans.variable].join(" "),
  },
  playful: {
    display: baloo,
    body: dmSans,
    variables: [baloo.variable, dmSans.variable].join(" "),
  },
  elegant: {
    display: cormorant,
    body: jost,
    variables: [cormorant.variable, jost.variable].join(" "),
  },
  modern: {
    display: spaceGrotesk,
    body: manrope,
    variables: [spaceGrotesk.variable, manrope.variable].join(" "),
  },
  loud: {
    display: passionOne,
    body: archivo,
    variables: [passionOne.variable, archivo.variable].join(" "),
  },
  clean: {
    display: jost,
    body: manrope,
    variables: [jost.variable, manrope.variable].join(" "),
  },
};

export const STOREFRONT_FONT_PAIRINGS: readonly StorefrontFontPairing[] =
  STOREFRONT_FONT_PAIRING_META.map((meta) => {
    if (meta.id === "default") {
      return {
        ...meta,
        display: null,
        body: null,
        variables: "",
      };
    }
    const faces = FACES[meta.id];
    return {
      ...meta,
      display: faces.display,
      body: faces.body,
      variables: faces.variables,
    };
  });

export function storefrontFontPairing(
  id: string | null | undefined,
): StorefrontFontPairing {
  return (
    STOREFRONT_FONT_PAIRINGS.find((p) => p.id === id) ??
    STOREFRONT_FONT_PAIRINGS[0]!
  );
}
