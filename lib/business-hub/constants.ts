/** Soft desk lift — sharp corners, quiet depth. */
export const HUB_SHADOW =
  "shadow-[0_1px_0_rgba(20,20,20,0.035),0_8px_22px_-14px_rgba(20,20,20,0.12)]";

export const HUB_EDGE =
  "border-[color-mix(in_srgb,#141414_8%,transparent)]";

export const HUB_RULE = HUB_EDGE;

export const HUB_CARD =
  `flex min-h-[108px] flex-col rounded-none border ${HUB_EDGE} bg-white p-3.5 ` +
  HUB_SHADOW;

export const HUB_SURFACE =
  `rounded-none border ${HUB_EDGE} bg-white overflow-hidden ` + HUB_SHADOW;

export const HUB_RAIL =
  `hub-rise relative overflow-hidden rounded-none border ${HUB_EDGE} bg-white text-[#141414] ` +
  HUB_SHADOW;

export const HUB_MUTED = "text-[#5C5C5C]";
export const HUB_INK = "text-[#141414]";
export const HUB_ACCENT = "#B08D48";
export const HUB_ACCENT_LIGHT = "#F7F2E8";
export const HUB_DIVIDE =
  "divide-[color-mix(in_srgb,#141414_8%,transparent)]";
export const HUB_BORDER =
  "border-[color-mix(in_srgb,#141414_8%,transparent)]";

/** Section title with a short brass index mark. */
export const HUB_SECTION =
  "inline-flex items-center gap-2 text-[12px] font-medium tracking-[-0.015em] text-[#141414] before:block before:h-px before:w-2.5 before:shrink-0 before:bg-[#B08D48] before:content-['']";

/** Interactive controls — sharp to match the desk. */
export const HUB_BTN =
  "rounded-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/35";

export const HUB_ICON_BTN =
  HUB_BTN +
  " inline-flex size-8 items-center justify-center border border-[color-mix(in_srgb,#141414_8%,transparent)] bg-white text-[#666666] hover:border-[#B08D48]/45 hover:text-[#8A6B2E] disabled:cursor-not-allowed disabled:opacity-60";

/** Quiet status chip — square, brass or ink. */
export const HUB_CHIP =
  "inline-flex shrink-0 items-center rounded-none px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em]";
