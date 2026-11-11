/**
 * Shared styling for the report controls, on the Kiosk operator shell (DESIGN.md):
 * 2px radius, hairline rules, forest accent, Manrope/Geist-Mono, calm. No in-content
 * shadows — a tinted-wide shadow is reserved for floating overlays, where elevation
 * carries hierarchy, and elevation is declared once (shadow, not border + shadow).
 */

const HAIR = "color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)";
const ACCENT = "var(--hub-accent,#1D4B3B)";

/** Secondary control — hairline outline, forest on hover/focus. */
export const reportBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-[2px] border bg-white px-2.5 text-[12px] font-medium " +
  `border-[${HAIR}] text-[var(--order-ink,#15231f)] transition-colors ` +
  `hover:border-[color-mix(in_srgb,${ACCENT}_45%,transparent)] hover:text-[${ACCENT}] ` +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)] " +
  "disabled:opacity-40 disabled:hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] " +
  "disabled:hover:text-[var(--order-ink,#15231f)]";

/** The single forest action per surface. */
export const reportBtnPrimary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[2px] px-4 text-[13px] font-semibold " +
  `bg-[${ACCENT}] text-white transition-colors hover:bg-[#163B2E] ` +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--pos-primary,#0f766e)] " +
  "disabled:opacity-50";

/** Quiet text action (Cancel, link-like). */
export const reportBtnGhost =
  "inline-flex h-8 items-center gap-1.5 rounded-[2px] px-2.5 text-[12px] font-medium " +
  `text-[${ACCENT}] transition-colors hover:bg-[color-mix(in_srgb,${ACCENT}_8%,transparent)] ` +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]";

/** Floating overlay container — tinted wide shadow, no border (elevation declared once). */
export const reportOverlay =
  "rounded-[2px] bg-white shadow-[0_18px_44px_-16px_rgba(18,26,22,0.38)]";

export const reportMenuItem =
  "flex w-full items-center justify-between rounded-[2px] px-2.5 py-1.5 text-[12px] font-medium " +
  `text-[var(--order-ink,#15231f)] transition-colors hover:bg-[color-mix(in_srgb,${ACCENT}_7%,white)]`;

/** Small status chip (channel badges, day pills). */
export const reportChip =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[-0.01em] " +
  `border-[${HAIR}]`;

export const reportMuted =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]";

export const reportFaint =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]";

export const reportHairline =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

export const reportDivide =
  "divide-[color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

export const reportPaper = "bg-[var(--hub-paper,#FCFAF5)]";

/** Geist Mono numerals/labels — DESIGN.md meta voice. */
export const reportMono = "font-mono tabular-nums";
