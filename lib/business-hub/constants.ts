/** Surfaces rely on a hairline edge plus the faintest lift — the phone board
 *  reads as rounded cards on a tinted page. */
export const HUB_SHADOW = "shadow-none";

/** The soft lift shared by every board card. */
export const HUB_CARD_SHADOW = "shadow-[0_1px_2px_rgba(16,24,40,0.05)]";

export const HUB_EDGE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)]";

export const HUB_RULE = HUB_EDGE;

export const HUB_CARD =
  `flex min-h-0 flex-col rounded-2xl border ${HUB_EDGE} bg-white p-4 ` +
  HUB_CARD_SHADOW;

export const HUB_SURFACE =
  `rounded-2xl border ${HUB_EDGE} bg-white overflow-hidden ` + HUB_CARD_SHADOW;

export const HUB_RAIL =
  `relative overflow-hidden rounded-2xl border ${HUB_EDGE} bg-white text-[var(--order-ink,#15231f)] ` +
  HUB_CARD_SHADOW;

export const HUB_MUTED =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]";
export const HUB_INK = "text-[var(--order-ink,#15231f)]";
export const HUB_ACCENT = "#0f766e";
export const HUB_ACCENT_LIGHT = "#ffffff";
export const HUB_DIVIDE =
  "divide-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)]";
export const HUB_BORDER =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)]";

export const HUB_SECTION =
  "inline-flex items-center gap-2 text-[14px] font-semibold tracking-[-0.01em] text-[#101828]";

export const HUB_BTN =
  "rounded-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]";

/** Plain icon affordance — no box, just a hit area and a soft hover. */
export const HUB_ICON_BTN =
  "inline-flex size-10 items-center justify-center rounded-full text-[#344054] transition-colors hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)] disabled:cursor-not-allowed disabled:opacity-50 sm:size-8";

export const HUB_CHIP =
  "inline-flex shrink-0 items-center rounded-full border border-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)] bg-white px-2 py-0.5 text-[11px] font-semibold tracking-[-0.02em]";
