/** Soft lift with offset — sharp surfaces, no radius. */
export const HUB_SHADOW =
  "shadow-[0_1px_0_rgba(20,20,20,0.04),0_10px_28px_-14px_rgba(20,20,20,0.14)]";

export const HUB_RULE =
  "border-[color-mix(in_srgb,#141414_9%,transparent)]";

export const HUB_CARD =
  "flex min-h-[108px] flex-col rounded-none border border-[color-mix(in_srgb,#141414_9%,transparent)] bg-white p-3.5 " +
  HUB_SHADOW;

export const HUB_SURFACE =
  "rounded-none border border-[color-mix(in_srgb,#141414_9%,transparent)] bg-white overflow-hidden " +
  HUB_SHADOW;

export const HUB_RAIL =
  "hub-rise relative overflow-hidden rounded-none border border-[color-mix(in_srgb,#141414_9%,transparent)] bg-white text-[#141414] " +
  HUB_SHADOW;

export const HUB_MUTED = "text-[#5C5C5C]";
export const HUB_INK = "text-[#141414]";
export const HUB_ACCENT = "#B08D48";
export const HUB_ACCENT_LIGHT = "#F7F2E8";

/** Section title with a short brass index mark. */
export const HUB_SECTION =
  "inline-flex items-center gap-2 text-[13px] font-medium tracking-[-0.015em] text-[#141414] before:block before:h-[1px] before:w-3 before:bg-[#B08D48] before:content-['']";

/** Interactive controls only — the one place radius is allowed. */
export const HUB_BTN =
  "rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/35";
