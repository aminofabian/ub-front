/** Shared visual tokens for shop checkout + confirmation */

export const CHECKOUT_PAGE_SHELL =
  "bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,color-mix(in_oklch,var(--primary)_6%,transparent),transparent)] bg-background";

export const CHECKOUT_CARD =
  "rounded-xl border border-border/45 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.03]";

export const CHECKOUT_CARD_PAD = "p-3 sm:p-3.5";

export const CHECKOUT_SECTION_GAP = "space-y-2.5";

export const CHECKOUT_CARD_INSET =
  "rounded-lg border border-border/40 bg-muted/15 ring-1 ring-black/[0.02]";

export const CHECKOUT_LABEL =
  "text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground";

export const CHECKOUT_INPUT =
  "h-10 w-full rounded-lg border border-input/70 bg-background/90 px-3 text-[13px] shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/55 focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/12";

export const CHECKOUT_SELECT = CHECKOUT_INPUT;

export const CHECKOUT_SERIF_AMOUNT =
  "font-serif text-lg font-semibold tabular-nums tracking-tight";

export const CHECKOUT_PRIMARY_BTN =
  "h-10 rounded-lg text-[13px] font-semibold shadow-sm transition-[transform,box-shadow] active:scale-[0.98]";

export const CHECKOUT_OUTLINE_BTN =
  "h-10 rounded-lg border-border/70 text-[13px] font-semibold";

export const CHECKOUT_STICKY_HEAD =
  "sticky top-0 z-10 -mx-0.5 shrink-0 border-b border-border/35 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75";
