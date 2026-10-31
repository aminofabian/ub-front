/** Shared colour + control classes for batch-count screens — Operate forest on ivory. */
export const COUNT_TONE = {
  ink: "text-[var(--op-ink,#121a16)]",
  mute: "text-[var(--op-muted,#556159)]",
  faint: "text-[var(--op-faint,#626d66)]",
  hair: "border-[var(--op-rule,rgba(18,26,22,0.1))]",
  divide: "divide-[var(--op-rule-soft,rgba(18,26,22,0.06))]",
  teal: "text-[var(--op-accent,#1d4b3b)]",
  tealFill: "bg-[var(--op-accent,#1d4b3b)]",
  tealWash: "bg-[var(--op-accent-soft,color-mix(in_srgb,#1d4b3b_7%,#fcfaf5))]",
  track: "bg-[color-mix(in_srgb,var(--op-ink,#121a16)_8%,transparent)]",
  surface: "bg-[var(--op-surface,#fcfaf5)]",
  display: "[font-family:var(--font-cormorant),Georgia,serif]",
  primaryButton:
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-[2px] bg-[var(--op-accent,#1d4b3b)] px-4 text-[15px] font-semibold tracking-[-0.01em] text-[var(--op-surface,#fcfaf5)] transition-[background-color,transform] duration-150 hover:bg-[var(--op-accent-deep,#163b2e)] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent,#1d4b3b)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--op-surface,#fcfaf5)]",
  quietButton:
    "inline-flex h-10 items-center justify-center gap-2 rounded-[2px] border border-[var(--op-rule,rgba(18,26,22,0.1))] bg-[var(--op-surface,#fcfaf5)] px-3.5 text-[14px] font-medium text-[var(--op-ink,#121a16)] transition-colors hover:bg-[color-mix(in_srgb,var(--op-accent,#1d4b3b)_5%,var(--op-surface,#fcfaf5))] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent,#1d4b3b)]",
} as const;
