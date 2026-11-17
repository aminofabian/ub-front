/** Surfaces rely on a hairline edge plus the faintest lift — the phone board
 *  reads as rounded cards on a tinted page. */
export const HUB_SHADOW = "shadow-none";

/** The soft lift shared by every board card. */
export const HUB_CARD_SHADOW = "shadow-none";

export const HUB_EDGE = "border-[var(--hub-rule,#E7E3D8)]";

export const HUB_RULE = HUB_EDGE;

export const HUB_CARD =
  `flex min-h-0 flex-col rounded-[20px] border ${HUB_EDGE} bg-[var(--hub-paper)] p-4 ` +
  HUB_CARD_SHADOW;

export const HUB_SURFACE =
  `rounded-[24px] border ${HUB_EDGE} bg-[var(--hub-paper)] overflow-hidden ` + HUB_CARD_SHADOW;

export const HUB_RAIL =
  `relative overflow-hidden rounded-[20px] border ${HUB_EDGE} bg-[var(--hub-paper)] text-[var(--order-ink,#15231f)] ` +
  HUB_CARD_SHADOW;

export const HUB_MUTED = "text-[var(--hub-muted,#5E6B65)]";
export const HUB_INK = "text-[var(--order-ink,#14211C)]";
export const HUB_ACCENT = "var(--hub-accent, #0F4A38)";
export const HUB_ACCENT_LIGHT = "var(--hub-paper, #FFFFFF)";
export const HUB_DIVIDE = "divide-[var(--hub-rule,#E7E3D8)]";
export const HUB_BORDER = "border-[var(--hub-rule,#E7E3D8)]";

export const HUB_SECTION =
  "inline-flex items-center gap-2 text-[17px] font-semibold tracking-[-0.005em] text-[var(--hub-ink,#14211C)]";

export const HUB_BTN =
  "rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0F4A38)]";

/** Plain icon affordance — no box, just a hit area and a soft hover. */
export const HUB_ICON_BTN =
  "inline-flex size-10 items-center justify-center rounded-full text-[var(--hub-ink,#121A16)] transition-colors hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)] disabled:cursor-not-allowed disabled:opacity-50 sm:size-8";

export const HUB_CHIP =
  "inline-flex shrink-0 items-center rounded-full border border-[var(--hub-rule,#E7E3D8)] bg-[var(--hub-paper)] px-2 py-0.5 text-[11px] font-semibold tracking-[-0.02em]";
