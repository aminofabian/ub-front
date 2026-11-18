import type { CSSProperties } from "react";

/**
 * Operator surfaces (dashboard, cashier desk, reports) share one type system:
 * Plus Jakarta Sans for UI and data, Cormorant for page-level display titles.
 * The variables are inherited by every page inside the dashboard shell.
 */
export const OPERATOR_STACK =
  'var(--font-plus-jakarta), "Plus Jakarta Sans", "Avenir Next", system-ui, "Segoe UI", sans-serif';

export const OPERATOR_SURFACE_STYLE = {
  ["--font-sans" as string]: OPERATOR_STACK,
  ["--font-heading" as string]: OPERATOR_STACK,
  // Keep the historical token in sync so components that still reference
  // `var(--font-manrope)` directly pick up the operator face too.
  ["--font-manrope" as string]: OPERATOR_STACK,
  ["--font-serif" as string]:
    'var(--font-cormorant), Georgia, "Times New Roman", serif',
  fontFamily: OPERATOR_STACK,
} as CSSProperties;

export const OPERATOR_SURFACE_CLASS = "font-sans";
