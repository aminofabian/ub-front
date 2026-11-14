import { cn } from "@/lib/utils";

/**
 * Setup lives in the Kiosk world (see DESIGN.md): ivory paper, ink, one forest
 * line, 2px edges, hairline rules. These strings are the whole vocabulary — a
 * step should not need a colour that is not here.
 */
export const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4B3B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1EA]";
export const FIELD_SHELL =
  "rounded-[2px] border border-[rgba(18,26,22,0.18)] bg-[#FCFAF5] transition-[border-color,box-shadow] duration-200";
export const FIELD_CLASS = cn(
  FIELD_SHELL,
  "h-12 w-full px-4 text-base text-[#121A16] outline-none placeholder:text-[#626D66] focus:border-[#1D4B3B] focus:ring-2 focus:ring-[#1D4B3B]/15 sm:text-[15px]",
);
export const FIELD_LABEL = "mb-1.5 block text-[13px] font-medium text-[#2A332E]";
export const NOTE = "text-[13px] leading-relaxed text-[#556159]";
export const QUIET_BUTTON = cn(
  "inline-flex min-h-11 items-center gap-1 text-sm text-[#556159] underline-offset-4 transition-colors duration-200 hover:text-[#121A16] hover:underline disabled:opacity-50",
  FOCUS_RING,
);
/** A paper key: resting on the counter, pressed in forest once chosen. */
export const KEY_BASE = cn(
  "rounded-[2px] border text-left touch-manipulation motion-safe:active:scale-[0.985]",
  "transition-[background-color,border-color,color,transform] duration-200",
  EASE,
  FOCUS_RING,
);
export const KEY_OFF =
  "border-[rgba(18,26,22,0.14)] bg-[#FCFAF5] text-[#121A16] hover:border-[rgba(18,26,22,0.3)] hover:bg-[#F7F4EC]";
export const KEY_ON =
  "border-[#1D4B3B] bg-[#1D4B3B] text-[#F4F1EA] hover:bg-[#163B2E]";
/** Width of the question column, and the grid that seats the receipt beside it. */
export const SETUP_GRID =
  "mx-auto w-full max-w-[60rem] lg:grid lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:gap-16";
