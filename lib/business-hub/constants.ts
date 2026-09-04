/** Soft lift — elevation alone, no competing hard border. */
export const HUB_SHADOW = "shadow-[0_1px_2px_rgba(20,20,20,0.04),0_8px_24px_-12px_rgba(20,20,20,0.08)]";

/** Hairline rule used when a surface needs an edge without a card shell. */
export const HUB_RULE = "border-[color-mix(in_srgb,#141414_8%,transparent)]";

export const HUB_CARD =
  "flex min-h-[108px] flex-col rounded-2xl border border-[color-mix(in_srgb,#141414_7%,transparent)] bg-white p-3.5 " +
  HUB_SHADOW;

export const HUB_SURFACE =
  "rounded-2xl border border-[color-mix(in_srgb,#141414_7%,transparent)] bg-white overflow-hidden " +
  HUB_SHADOW;

export const HUB_RAIL =
  "hub-rise relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,#141414_7%,transparent)] bg-white text-[#141414] " +
  HUB_SHADOW;

export const HUB_MUTED = "text-[#6B6B6B]";
export const HUB_INK = "text-[#141414]";
export const HUB_ACCENT = "#B08D48";
export const HUB_ACCENT_LIGHT = "#F9F6F0";

/** Quiet section heading — readable, not stamped. */
export const HUB_SECTION =
  "text-[13px] font-medium tracking-[-0.01em] text-[#141414]";
