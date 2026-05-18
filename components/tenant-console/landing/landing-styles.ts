import type { CSSProperties } from "react";

/* ── Light theme (default) ── */
const LIGHT = {
  bg: "#FAF9F6",
  surface: "#F3F1ED",
  elevated: "#FFFFFF",
  panel: "#F6F5F2",
  text: "#141412",
  textMuted: "#5F5D58",
  textSoft: "#6B6863",
  textDim: "#8A8782",
  textFaint: "#A5A29D",
  border: "rgba(20, 20, 18, 0.08)",
  borderSoft: "rgba(20, 20, 18, 0.05)",
  borderStrong: "rgba(20, 20, 18, 0.12)",
  cardBg: "rgba(20, 20, 18, 0.02)",
  cardBgHover: "rgba(20, 20, 18, 0.04)",
  gridLine: "rgba(20, 20, 18, 0.04)",
  glowGold: "rgba(200, 169, 110, 0.10)",
  gold: "#B8882E",
  goldHover: "#C89A3A",
  goldSoft: "rgba(184, 136, 46, 0.08)",
  goldSurface: "rgba(184, 136, 46, 0.04)",
  goldBorder: "rgba(184, 136, 46, 0.22)",
  goldBorderStrong: "rgba(184, 136, 46, 0.38)",
  ctaText: "#141412",
  ghostHoverBg: "rgba(20, 20, 18, 0.04)",
  ghostHoverBorder: "rgba(20, 20, 18, 0.22)",
  success: "#3D7A4F",
  successBg: "rgba(61, 122, 79, 0.10)",
  successShadow: "rgba(61, 122, 79, 0.18)",
  danger: "#A0453D",
  dangerBg: "rgba(160, 69, 61, 0.08)",
  dangerBar: "#A0453D",
  navBlurBg: "rgba(250, 249, 246, 0.90)",
  brandMuted: "#7A7670",
} as const;

/* ── Dark theme ── */
const DARK = {
  bg: "#080808",
  surface: "#0D0D0D",
  elevated: "#111111",
  panel: "#161616",
  text: "#F0EDE6",
  textMuted: "#8A8278",
  textSoft: "#6B6560",
  textDim: "#4A4640",
  textFaint: "#3D3A36",
  border: "rgba(240, 237, 230, 0.07)",
  borderSoft: "rgba(240, 237, 230, 0.05)",
  borderStrong: "rgba(240, 237, 230, 0.12)",
  cardBg: "rgba(240, 237, 230, 0.03)",
  cardBgHover: "rgba(240, 237, 230, 0.05)",
  gridLine: "rgba(240, 237, 230, 0.03)",
  glowGold: "rgba(200, 169, 110, 0.08)",
  gold: "#C8A96E",
  goldHover: "#D9BC83",
  goldSoft: "rgba(200, 169, 110, 0.08)",
  goldSurface: "rgba(200, 169, 110, 0.04)",
  goldBorder: "rgba(200, 169, 110, 0.20)",
  goldBorderStrong: "rgba(200, 169, 110, 0.35)",
  ctaText: "#080808",
  ghostHoverBg: "rgba(240, 237, 230, 0.04)",
  ghostHoverBorder: "rgba(240, 237, 230, 0.30)",
  success: "#5D9E6A",
  successBg: "rgba(93, 158, 106, 0.10)",
  successShadow: "rgba(93, 158, 106, 0.20)",
  danger: "#A85A50",
  dangerBg: "rgba(168, 90, 80, 0.10)",
  dangerBar: "#8B3A30",
  navBlurBg: "rgba(8, 8, 8, 0.92)",
  brandMuted: "#3A3632",
} as const;

/* ── Active theme (light default) ── */
const T = LIGHT;

export function landingRootStyle(): CSSProperties {
  return {
    "--kiosk-bg": T.bg,
    "--kiosk-surface": T.surface,
    "--kiosk-elevated": T.elevated,
    "--kiosk-panel": T.panel,
    "--kiosk-text": T.text,
    "--kiosk-text-muted": T.textMuted,
    "--kiosk-text-soft": T.textSoft,
    "--kiosk-text-dim": T.textDim,
    "--kiosk-text-faint": T.textFaint,
    "--kiosk-border": T.border,
    "--kiosk-border-soft": T.borderSoft,
    "--kiosk-border-strong": T.borderStrong,
    "--kiosk-card-bg": T.cardBg,
    "--kiosk-card-bg-hover": T.cardBgHover,
    "--kiosk-grid-line": T.gridLine,
    "--kiosk-glow-gold": T.glowGold,
    "--kiosk-gold": T.gold,
    "--kiosk-gold-hover": T.goldHover,
    "--kiosk-gold-soft": T.goldSoft,
    "--kiosk-gold-surface": T.goldSurface,
    "--kiosk-gold-border": T.goldBorder,
    "--kiosk-gold-border-strong": T.goldBorderStrong,
    "--kiosk-cta-text": T.ctaText,
    "--kiosk-ghost-hover-bg": T.ghostHoverBg,
    "--kiosk-ghost-hover-border": T.ghostHoverBorder,
    "--kiosk-success": T.success,
    "--kiosk-success-bg": T.successBg,
    "--kiosk-success-shadow": T.successShadow,
    "--kiosk-danger": T.danger,
    "--kiosk-danger-bg": T.dangerBg,
    "--kiosk-danger-bar": T.dangerBar,
    "--kiosk-nav-blur-bg": T.navBlurBg,
    "--kiosk-brand-muted": T.brandMuted,
    backgroundColor: T.bg,
    color: T.text,
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
  } as CSSProperties;
}

export { LIGHT as LANDING_LIGHT, DARK as LANDING_DARK };

export const goldCtaClass =
  "inline-flex items-center justify-center gap-2 rounded-md bg-[var(--kiosk-gold)] px-6 py-3 text-sm font-medium text-[var(--kiosk-cta-text)] transition-all duration-200 hover:bg-[var(--kiosk-gold-hover)] hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-50";

export const ghostCtaClass =
  "inline-flex items-center justify-center gap-2 rounded-md border border-[var(--kiosk-border-strong)] bg-transparent px-6 py-3 text-sm font-normal text-[var(--kiosk-text)] transition-all duration-200 hover:border-[var(--kiosk-ghost-hover-border)] hover:bg-[var(--kiosk-ghost-hover-bg)] disabled:pointer-events-none disabled:opacity-50";

/** Bordered card with subtle hover effect — used across landing sections. */
export const landingCardClass =
  "rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-card-bg)] transition-all duration-300 hover:border-[var(--kiosk-gold-border)] hover:bg-[var(--kiosk-card-bg-hover)]";

/** Section label — small uppercase gold badge. */
export const sectionLabelClass =
  "text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--kiosk-gold)]";

/** Logo pill badge. */
export const logoPillClass =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-3.5 py-1.5 text-xs font-medium tracking-[0.02em] text-[var(--kiosk-gold)]";
