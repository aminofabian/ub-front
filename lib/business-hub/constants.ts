/** Hairline only — no lift. */
export const HUB_SHADOW = "shadow-none";

export const HUB_EDGE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

export const HUB_RULE = HUB_EDGE;

export const HUB_CARD =
  `flex min-h-0 flex-col rounded-none border ${HUB_EDGE} bg-white p-2.5 ` +
  HUB_SHADOW;

export const HUB_SURFACE =
  `rounded-none border ${HUB_EDGE} bg-white overflow-hidden ` + HUB_SHADOW;

export const HUB_RAIL =
  `relative overflow-hidden rounded-none border ${HUB_EDGE} bg-white text-[var(--order-ink,#15231f)] ` +
  HUB_SHADOW;

export const HUB_MUTED =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]";
export const HUB_INK = "text-[var(--order-ink,#15231f)]";
export const HUB_ACCENT = "#0f766e";
export const HUB_ACCENT_LIGHT = "#ffffff";
export const HUB_DIVIDE =
  "divide-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
export const HUB_BORDER =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

export const HUB_SECTION =
  "inline-flex items-center gap-2 text-[12px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]";

export const HUB_BTN =
  "rounded-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]";

export const HUB_ICON_BTN =
  HUB_BTN +
  " inline-flex size-7 items-center justify-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[var(--pos-primary,#0f766e)] hover:border-[var(--pos-primary,#0f766e)] disabled:cursor-not-allowed disabled:opacity-60";

export const HUB_CHIP =
  "inline-flex shrink-0 items-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-1.5 py-0.5 text-[11px] font-semibold tracking-[-0.02em]";
