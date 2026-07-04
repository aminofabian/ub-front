/** Shared visual tokens for shop checkout + confirmation */

export const CHECKOUT_PAGE_SHELL =
  "bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,color-mix(in_srgb,var(--primary)_9%,transparent),transparent)] bg-background";

export const CHECKOUT_CARD_PAD = "p-3 sm:p-3.5";

export const CHECKOUT_SECTION_GAP = "space-y-2.5";

export const CHECKOUT_CARD_INSET =
  "rounded-lg border border-[color-mix(in_srgb,var(--primary)_10%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--muted))] ring-1 ring-[color-mix(in_srgb,var(--primary)_5%,transparent)]";

export const CHECKOUT_LABEL =
  "text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground";

/** Group label inside a form card */
export const CHECKOUT_FORM_GROUP_LABEL =
  "text-xs font-semibold tracking-tight text-foreground";

/** Soft inset for grouped fields */
export const CHECKOUT_FORM_GROUP =
  "space-y-3 rounded-xl border border-border/50 bg-muted/15 p-3 sm:p-3.5";

export const CHECKOUT_INPUT_COMPLETE =
  "border-[color-mix(in_srgb,var(--primary)_28%,var(--input))] bg-[color-mix(in_srgb,var(--primary)_4%,var(--background))]";

export const CHECKOUT_ACCOUNT_NUDGE =
  "rounded-xl border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_8%,transparent),color-mix(in_srgb,var(--primary)_3%,var(--card)))] p-3.5 sm:p-4";

/** Matches variant chips on checkout line items */
export const CHECKOUT_VARIANT_PILL =
  "inline-flex max-w-full truncate rounded-md bg-[color-mix(in_srgb,var(--primary)_8%,var(--muted))] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[color-mix(in_srgb,var(--primary)_55%,var(--foreground))]";

export const CHECKOUT_INPUT =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-[color-mix(in_srgb,var(--foreground)_14%,var(--input))] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 autofill:shadow-[inset_0_0_0px_1000px_var(--background)] autofill:[-webkit-text-fill-color:var(--foreground)]";

/** Lighter fields for compact surfaces like the delivery edit drawer */
export const CHECKOUT_INPUT_PLAIN =
  "h-9 w-full min-w-0 rounded-md border border-border bg-background px-2.5 text-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/20 autofill:shadow-[inset_0_0_0px_1000px_var(--background)] autofill:[-webkit-text-fill-color:var(--foreground)]";

export const CHECKOUT_LABEL_PLAIN = "text-xs font-medium text-foreground/85";

export const CHECKOUT_SELECT = CHECKOUT_INPUT;

export const CHECKOUT_SERIF_AMOUNT =
  "font-serif text-lg font-semibold tabular-nums tracking-tight";

/** Compact totals in sticky docks — sans-serif avoids faux-bold overlap in tight layouts */
export const CHECKOUT_DOCK_AMOUNT =
  "text-base font-bold tabular-nums tracking-tight text-foreground";

export const CHECKOUT_PRIMARY_BTN =
  "h-10 rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition-[transform,box-shadow] hover:bg-[var(--primary-hover)] active:scale-[0.98]";

export const CHECKOUT_OUTLINE_BTN =
  "h-10 rounded-lg border-border/70 text-[13px] font-semibold";

export const CHECKOUT_STICKY_HEAD =
  "sticky top-0 z-10 -mx-0.5 shrink-0 border-b border-[color-mix(in_srgb,var(--primary)_16%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--background))] backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--primary)_4%,var(--background))]";

/** Section chrome tinted with tenant `--primary` */
export const CHECKOUT_SECTION_HEAD =
  "border-b border-[color-mix(in_srgb,var(--primary)_20%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))]";

export const CHECKOUT_SECTION_ICON_WRAP =
  "flex shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-primary";

export const CHECKOUT_SECTION_DIVIDER =
  "border-[color-mix(in_srgb,var(--primary)_14%,var(--border))]";

export const CHECKOUT_SECTION_INSET =
  "rounded-lg bg-[color-mix(in_srgb,var(--primary)_6%,var(--muted))]";

export const CHECKOUT_PAYMENT_PANEL =
  "rounded-lg border border-[color-mix(in_srgb,var(--primary)_18%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))]";

export const CHECKOUT_CARD =
  "rounded-xl border border-[color-mix(in_srgb,var(--primary)_12%,var(--border))] bg-card/95 shadow-[0_1px_2px_color-mix(in_srgb,var(--primary)_8%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--primary)_6%,transparent)]";

/** Ward · subcounty · county without repeating the same segment */
export function formatDeliveryZone(
  ward?: string,
  subCounty?: string,
  county?: string,
): string | null {
  const parts: string[] = [];
  for (const raw of [ward, subCounty, county]) {
    const t = raw?.trim();
    if (!t) continue;
    if (!parts.some((p) => p.toLowerCase() === t.toLowerCase())) {
      parts.push(t);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
