import type { CSSProperties } from "react";

import { oxanium } from "@/app/fonts/oxanium";

/**
 * Override body + heading stacks so a subtree renders entirely in Oxanium.
 * Relies on `--font-oxanium` from next/font (see app/fonts/oxanium.ts).
 * Importing this module loads Oxanium — keep it off cashier / lean routes.
 */
export const OXANIUM_STACK =
  'var(--font-oxanium), Oxanium, system-ui, "Segoe UI", sans-serif';

export const OXANIUM_SURFACE_STYLE = {
  ["--font-sans" as string]: OXANIUM_STACK,
  ["--font-heading" as string]: OXANIUM_STACK,
  ["--font-serif" as string]: OXANIUM_STACK,
  fontFamily: OXANIUM_STACK,
} as CSSProperties;

/** Includes the next/font variable class so faces load with the surface. */
export const OXANIUM_SURFACE_CLASS = `${oxanium.variable} font-sans`;
