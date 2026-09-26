import type { CSSProperties } from "react";

/**
 * Override body + heading stacks so a subtree renders entirely in Oxanium.
 * Relies on `--font-oxanium` from next/font (see app/fonts/oxanium.ts).
 */
export const OXANIUM_STACK =
  'var(--font-oxanium), Oxanium, system-ui, "Segoe UI", sans-serif';

export const OXANIUM_SURFACE_STYLE = {
  ["--font-sans" as string]: OXANIUM_STACK,
  ["--font-heading" as string]: OXANIUM_STACK,
  ["--font-serif" as string]: OXANIUM_STACK,
  fontFamily: OXANIUM_STACK,
} as CSSProperties;

export const OXANIUM_SURFACE_CLASS = "font-sans";
