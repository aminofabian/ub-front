import type { CSSProperties } from "react";

/* ── Light theme (default) ── */
const LIGHT = {
  bg: "#F4F1EA",
  surface: "#ECE7DC",
  elevated: "#FCFAF5",
  panel: "#EFEBE2",
  text: "#121A16",
  textMuted: "#556159",
  textSoft: "#5D6860",
  textDim: "#646F68",
  textFaint: "#626D66",
  border: "rgba(18, 26, 22, 0.10)",
  borderSoft: "rgba(18, 26, 22, 0.06)",
  borderStrong: "rgba(18, 26, 22, 0.18)",
  cardBg: "rgba(18, 26, 22, 0.025)",
  cardBgHover: "rgba(18, 26, 22, 0.045)",
  gridLine: "rgba(18, 26, 22, 0.035)",
  glowGold: "rgba(29, 75, 59, 0.10)",
  gold: "#1D4B3B",
  goldHover: "#163B2E",
  goldSoft: "rgba(29, 75, 59, 0.07)",
  goldSurface: "rgba(29, 75, 59, 0.04)",
  goldBorder: "rgba(29, 75, 59, 0.22)",
  goldBorderStrong: "rgba(29, 75, 59, 0.40)",
  ctaText: "#F7F3E8",
  ghostHoverBg: "rgba(18, 26, 22, 0.045)",
  ghostHoverBorder: "rgba(18, 26, 22, 0.26)",
  success: "#2F6B52",
  successBg: "rgba(47, 107, 82, 0.10)",
  successShadow: "rgba(29, 75, 59, 0.18)",
  danger: "#A14F3C",
  dangerBg: "rgba(161, 79, 60, 0.08)",
  dangerBar: "#A14F3C",
  navBlurBg: "rgba(244, 241, 234, 0.88)",
  brandMuted: "#7C827B",
  highlight: "#A55237",
} as const;

/* ── Dark theme ── */
const DARK = {
  bg: "#0D1713",
  surface: "#121F19",
  elevated: "#16241D",
  panel: "#1A2A22",
  text: "#F2EDE1",
  textMuted: "#B7B1A4",
  textSoft: "#A9A396",
  textDim: "#989286",
  textFaint: "#8A857A",
  border: "rgba(242, 237, 225, 0.10)",
  borderSoft: "rgba(242, 237, 225, 0.06)",
  borderStrong: "rgba(242, 237, 225, 0.18)",
  cardBg: "rgba(242, 237, 225, 0.035)",
  cardBgHover: "rgba(242, 237, 225, 0.055)",
  gridLine: "rgba(242, 237, 225, 0.03)",
  glowGold: "rgba(185, 208, 192, 0.10)",
  gold: "#B9D0C0",
  goldHover: "#D0E0D4",
  goldSoft: "rgba(185, 208, 192, 0.10)",
  goldSurface: "rgba(185, 208, 192, 0.06)",
  goldBorder: "rgba(185, 208, 192, 0.22)",
  goldBorderStrong: "rgba(185, 208, 192, 0.38)",
  ctaText: "#10231A",
  ghostHoverBg: "rgba(242, 237, 225, 0.06)",
  ghostHoverBorder: "rgba(242, 237, 225, 0.32)",
  success: "#8FB7A1",
  successBg: "rgba(143, 183, 161, 0.12)",
  successShadow: "rgba(143, 183, 161, 0.22)",
  danger: "#D08A6E",
  dangerBg: "rgba(208, 138, 110, 0.10)",
  dangerBar: "#B45B3E",
  navBlurBg: "rgba(13, 23, 19, 0.90)",
  brandMuted: "#3E4A43",
  highlight: "#D08A6E",
} as const;

type LandingTheme = typeof LIGHT | typeof DARK;

function themeVars(T: LandingTheme): CSSProperties {
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
    "--kiosk-highlight": T.highlight,
    backgroundColor: T.bg,
    color: T.text,
  } as CSSProperties;
}

export function landingRootStyle(): CSSProperties {
  return themeVars(LIGHT);
}

/** Scoped dark palette — apply to a section to invert it against the page. */
export function landingDarkSectionStyle(): CSSProperties {
  return themeVars(DARK);
}

export { LIGHT as LANDING_LIGHT, DARK as LANDING_DARK };

export const goldCtaClass =
  "group/cta inline-flex items-center justify-center gap-2.5 rounded-[2px] bg-[var(--kiosk-gold)] px-6 py-3 text-[13px] font-semibold tracking-[0.01em] text-[var(--kiosk-cta-text)] transition-[background-color,transform,box-shadow] duration-200 hover:bg-[var(--kiosk-gold-hover)] hover:-translate-y-px hover:shadow-[0_10px_28px_-14px_rgba(18,26,22,0.45)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50";

export const ghostCtaClass =
  "inline-flex items-center justify-center gap-2 rounded-[2px] border border-[var(--kiosk-border-strong)] bg-transparent px-6 py-3 text-[13px] font-medium tracking-[0.01em] text-[var(--kiosk-text)] transition-[border-color,background-color,color] duration-200 hover:border-[var(--kiosk-ghost-hover-border)] hover:bg-[var(--kiosk-ghost-hover-bg)] disabled:pointer-events-none disabled:opacity-50";

/** Bordered card with subtle hover effect — used across landing sections. */
export const landingCardClass =
  "rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-card-bg)] transition-all duration-300 hover:border-[var(--kiosk-gold-border)] hover:bg-[var(--kiosk-card-bg-hover)]";

/** Section label — small uppercase gold badge. */
export const sectionLabelClass =
  "text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--kiosk-gold)]";

/** Sharp section label with subtle fill — not a pill. */
export const sectionLabelPillClass =
  "inline-flex items-center border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-gold)]";

/** Icon container used in bento cards and steps. */
export const landingIconWrapClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] text-[var(--kiosk-gold)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]";

/** Bento / feature card with register-corner accents. */
export const landingBentoCardClass =
  "landing-bento-card group relative overflow-hidden rounded-[2px] border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] transition-all duration-300 hover:border-[var(--kiosk-gold-border)] hover:shadow-[0_12px_40px_-16px_var(--kiosk-success-shadow)]";

/** Logo pill badge. */
export const logoPillClass =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-3.5 py-1.5 text-xs font-medium tracking-[0.02em] text-[var(--kiosk-gold)]";

/** Standard landing section padding — tighter on phones. */
export const landingSectionClass = "px-4 py-16 sm:px-10 sm:py-32 lg:py-36";

export const landingSectionBorderClass = `${landingSectionClass} border-t border-[var(--kiosk-border-soft)]`;

export const landingSectionHeaderMb = "mb-12 sm:mb-20 md:mb-24";

export const landingSectionHeadingClass =
  "font-heading text-[clamp(30px,5.4vw,60px)] leading-[1.04] tracking-[-0.02em] text-[var(--kiosk-text)]";

export const landingCardPadding = "p-5 sm:p-8";

/** Alternating section surface — use on every other block. */
export const landingSectionAltClass =
  "landing-section-alt border-t border-[var(--kiosk-border-soft)] bg-[color-mix(in_srgb,var(--kiosk-panel)_55%,var(--kiosk-bg))]";
