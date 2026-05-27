/**
 * Compile-time flag for the desktop / on-premise distribution
 * (see {@code DESKTOP_INSTALLATION.md} §6).
 *
 * `next build` reads `process.env.NEXT_PUBLIC_RUNTIME` at build time and inlines
 * the literal string into the bundle, so this constant becomes a literal
 * `true` / `false` after build — dead-code elimination removes the unreachable
 * branch in either SKU.
 *
 * The shared constant exists so the eight (and growing) UI fence sites all
 * agree on the same source of truth; importing it from one place also lets
 * us add per-tier overrides later (e.g. `IS_DESKTOP_LAN_SERVER`) without
 * grepping the codebase.
 */
export const IS_DESKTOP = process.env.NEXT_PUBLIC_RUNTIME === "desktop";
