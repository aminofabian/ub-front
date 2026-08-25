import { cn } from "@/lib/utils";

/**
 * Catalog form type scale — one ink family, one capitalization rule.
 *
 * Chrome (sections / kickers): quiet uppercase, even foreground/40
 * Labels: sentence case, even foreground/55
 * Body: foreground
 * Hints: foreground/45
 */

/** Field labels — sentence case, never shout */
export const productFormLabelClass = cn(
  "text-[11px] font-medium leading-none tracking-normal text-foreground/55",
);

/** Section kickers inside drawers / sheets */
export const productFormSectionTitleClass = cn(
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/40",
);

/** Helper / preview copy under fields */
export const productFormHintClass = cn(
  "text-[11px] font-normal leading-snug text-foreground/45",
);

export const productFormPreviewClass = productFormHintClass;

/** Required asterisk — same family as label, quiet red */
export const productFormRequiredClass = "text-destructive/80";

/** Compact single-line inputs — square, thin border, no shadow */
export const productFormInputClass = cn(
  "h-8 w-full rounded-none border border-border bg-background px-2.5 text-[13px] leading-none text-foreground shadow-none",
  "placeholder:text-foreground/35",
  "focus-visible:border-foreground/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30",
  "disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-foreground/40",
);

export const productFormInputMonoClass = cn(
  productFormInputClass,
  "font-mono text-xs tracking-tight text-foreground/85",
);

export const productFormSelectClass = cn(
  productFormInputClass,
  "cursor-pointer py-0",
);

export const productFormTextareaClass = cn(
  productFormInputClass,
  "h-auto min-h-[4.25rem] resize-y py-2 leading-snug",
);

export const productFormFieldClass = "flex min-w-0 flex-col gap-1.5";

export const productFormGrid2Class = "grid grid-cols-1 gap-2.5 sm:grid-cols-2";

export const productFormGrid3Class = "grid grid-cols-1 gap-2.5 sm:grid-cols-3";

export const productFormSectionClass = cn(
  "space-y-2 rounded-none border border-border bg-muted/10 p-2.5 shadow-none",
);

/** Inline quick-edit strip in the detail panel */
export const productFormInlineEditClass = cn(
  "border-l-2 border-primary/40 bg-primary/[0.04] px-2.5 py-2",
);

export const productFormStackClass = "flex flex-col gap-3";

/** Stack of sheet sections — one continuous bordered form */
export const productFormDrawerStackClass = cn(
  "flex flex-col gap-0 overflow-hidden rounded-none border border-border bg-background shadow-none",
  "divide-y divide-border",
);

export const productFormSectionBodyClass = cn(
  "space-y-3 rounded-none border-0 bg-transparent p-3.5 shadow-none",
);

/** Collapsible drawer panels — tighter than default section body */
export const productFormSectionBodyCompactClass = cn(
  "space-y-2 rounded-none border-0 bg-transparent p-2.5 shadow-none",
);

export const productFormSectionToggleClass = cn(
  "group flex w-full items-center gap-2 rounded-none border-0 border-b border-border px-3 py-2 text-left transition-colors",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/40",
);

export const productFormSectionToggleLabelClass = cn(
  "text-[13px] font-semibold tracking-tight text-foreground",
);

export const productFormSectionToggleHintClass = productFormHintClass;

export const productFormDrawerHeroClass = cn(
  "flex items-start gap-3 rounded-none border-0 border-b border-border bg-muted/20 p-3 shadow-none",
);

export const productFormToggleCardClass = cn(
  "flex cursor-pointer items-start gap-3 rounded-none border border-border px-3.5 py-3 transition-colors",
  "has-[:checked]:border-foreground/40 has-[:checked]:bg-muted/30",
  "hover:bg-muted/20",
);

/** Micro actions / chips inside forms */
export const productFormChipTextClass = cn(
  "text-[11px] font-medium tracking-tight text-foreground/70",
);

/** Footer meta (“Keep open”) */
export const productFormMetaClass = cn(
  "text-[11px] font-medium tracking-tight text-foreground/50",
);
