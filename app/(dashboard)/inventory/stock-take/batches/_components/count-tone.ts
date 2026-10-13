/** Shared colour classes for the batch-count screens, from the app's ink + teal tokens. */
export const COUNT_TONE = {
  ink: "text-[var(--order-ink,#15231f)]",
  mute: "text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
  faint: "text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]",
  hair: "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
  divide: "divide-[color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]",
  teal: "text-[var(--pos-primary,#0f766e)]",
  tealFill: "bg-[var(--pos-primary,#0f766e)]",
  tealWash: "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]",
  track: "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]",
  primaryButton:
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--pos-primary,#0f766e)] px-5 font-heading text-[17px] font-semibold tracking-[-0.01em] text-white transition-[background-color,transform] duration-150 hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_88%,black)] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)] focus-visible:ring-offset-2",
  quietButton:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white px-4 text-[15px] font-medium text-[var(--order-ink,#15231f)] transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
} as const;
