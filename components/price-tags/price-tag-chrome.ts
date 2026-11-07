import { CATALOG_BTN } from "@/app/(dashboard)/products/_components/catalog-chrome";
import { cn } from "@/lib/utils";

/**
 * Controls shared by the price tag page. Chips are the choice buttons (roll
 * size, template, sheet count); they grow to 40px on touch screens so a
 * thumb lands on one chip, not two.
 */
export const TAG_CHIP = cn(
  CATALOG_BTN,
  "inline-flex h-8 shrink-0 items-center whitespace-nowrap border px-3 text-[12.5px] tabular-nums pointer-coarse:h-10 pointer-coarse:px-3.5",
);

export const TAG_CHIP_IDLE =
  "border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white text-[var(--catalog-ink,#121A16)] hover:border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_28%,transparent)]";

/** The chosen option in a group that has one answer (template, roll size). */
export const TAG_CHIP_ON = "border-[#1D4B3B] bg-white text-[#1D4B3B] shadow-[inset_0_0_0_1px_#1D4B3B]";

/** The chosen side of a two-way switch (A4 sheet / Label roll). */
export const TAG_CHIP_SOLID = "border-[#1D4B3B] bg-[#1D4B3B] text-white";

/**
 * A row of chips: one line that scrolls sideways on a phone, so nothing
 * wraps into a ragged block, and wraps on wider screens.
 */
export const TAG_STRIP =
  "flex gap-1.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible";

export const TAG_LABEL = "text-[12px] text-[#556159]";

export const TAG_NOTE = "text-[12px] leading-relaxed text-[#556159]";

/** A quiet panel: hairline rule, paper surface, no shadow. */
export const TAG_PANEL = "border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_10%,transparent)] bg-[var(--catalog-shelf,#FCFAF5)]";

export const TAG_HAIRLINE = "border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_10%,transparent)]";
