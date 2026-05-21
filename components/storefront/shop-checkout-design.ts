/** Shared visual tokens for shop checkout + confirmation */

export const CHECKOUT_PAGE_SHELL =
  "bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent)] bg-background";

export const CHECKOUT_CARD =
  "rounded-2xl border border-border/50 bg-card/95 shadow-[0_1px_3px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.035]";

export const CHECKOUT_CARD_INSET =
  "rounded-xl border border-border/45 bg-muted/20 ring-1 ring-black/[0.02]";

export const CHECKOUT_LABEL =
  "text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground";

export const CHECKOUT_INPUT =
  "h-11 w-full rounded-xl border border-input/70 bg-background/90 px-3.5 text-sm shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15";

export const CHECKOUT_SELECT = CHECKOUT_INPUT;

export const CHECKOUT_SERIF_AMOUNT = "font-serif text-xl font-semibold tabular-nums tracking-tight";

export const CHECKOUT_PRIMARY_BTN =
  "h-11 rounded-xl font-semibold shadow-md transition-[transform,box-shadow] active:scale-[0.98]";

export const CHECKOUT_OUTLINE_BTN =
  "h-11 rounded-xl border-border/70 font-semibold";
