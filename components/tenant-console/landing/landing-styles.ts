import type { CSSProperties } from "react";

/** Kiosk landing — warm paper + deep ink + burnished gold. */
export const LANDING_THEME = {
  ink: "#141412",
  inkMuted: "#5f5e58",
  inkSoft: "#8a8983",
  paper: "#f9f8f5",
  paperDeep: "#f0efea",
  surface: "#ffffff",
  border: "rgba(20, 20, 18, 0.08)",
  borderStrong: "rgba(20, 20, 18, 0.13)",
  gold: "#b8862b",
  goldDeep: "#9a6f1e",
  goldBright: "#d4a84b",
  goldSoft: "rgba(184, 134, 43, 0.12)",
  goldGlow: "rgba(212, 168, 75, 0.30)",
  goldSurface: "rgba(184, 134, 43, 0.06)",
  success: "#2d8a56",
} as const;

export function landingRootStyle(): CSSProperties {
  return {
    "--landing-ink": LANDING_THEME.ink,
    "--landing-ink-muted": LANDING_THEME.inkMuted,
    "--landing-ink-soft": LANDING_THEME.inkSoft,
    "--landing-paper": LANDING_THEME.paper,
    "--landing-paper-deep": LANDING_THEME.paperDeep,
    "--landing-surface": LANDING_THEME.surface,
    "--landing-border": LANDING_THEME.border,
    "--landing-border-strong": LANDING_THEME.borderStrong,
    "--landing-gold": LANDING_THEME.gold,
    "--landing-gold-deep": LANDING_THEME.goldDeep,
    "--landing-gold-bright": LANDING_THEME.goldBright,
    "--landing-gold-soft": LANDING_THEME.goldSoft,
    "--landing-gold-glow": LANDING_THEME.goldGlow,
    "--landing-gold-surface": LANDING_THEME.goldSurface,
    "--landing-success": LANDING_THEME.success,
    backgroundColor: LANDING_THEME.paper,
    color: LANDING_THEME.ink,
  } as CSSProperties;
}

export const primaryCtaClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--landing-ink)] px-7 py-3.5 text-[15px] font-semibold text-[#faf9f7] shadow-[0_1px_2px_rgba(20,20,18,0.12),0_8px_24px_rgba(20,20,18,0.12)] transition-all duration-300 hover:bg-[#1f1f1c] hover:shadow-[0_2px_4px_rgba(20,20,18,0.14),0_14px_32px_rgba(20,20,18,0.16)] hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export const goldCtaClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--landing-gold)] px-7 py-3.5 text-[15px] font-semibold text-[#fffdf8] shadow-[0_1px_2px_rgba(184,134,43,0.22),0_8px_24px_rgba(184,134,43,0.18)] transition-all duration-300 hover:bg-[var(--landing-gold-deep)] hover:shadow-[0_2px_4px_rgba(184,134,43,0.28),0_14px_36px_rgba(184,134,43,0.25)] hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export const ghostCtaClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[var(--landing-border)] bg-[var(--landing-surface)] px-7 py-3.5 text-[15px] font-medium text-[var(--landing-ink)] shadow-[0_1px_2px_rgba(20,20,18,0.03)] transition-all duration-300 hover:border-[var(--landing-border-strong)] hover:shadow-[0_4px_16px_rgba(20,20,18,0.05)] hover:-translate-y-0.5 active:scale-[0.98]";

/** Subtle card style used across landing sections. */
export const landingCardClass =
  "rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] shadow-[0_1px_3px_rgba(20,20,18,0.04)] transition-all duration-400 hover:shadow-[0_8px_32px_rgba(20,20,18,0.07)] hover:border-[var(--landing-border-strong)] hover:-translate-y-0.5";

/** Section label — small uppercase badge. */
export const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.20em] text-[var(--landing-ink-muted)]";

/** Section heading — large, tight, high-impact. */
export const sectionHeadingClass =
  "font-heading text-3xl font-bold tracking-[-0.035em] sm:text-4xl xl:text-[2.65rem] xl:leading-[1.05]";
