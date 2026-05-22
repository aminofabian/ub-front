import { cn } from "@/lib/utils";

/** Compact single-line inputs — drawers, filters, detail quick-edit */
export const productFormInputClass = cn(
  "h-8 w-full rounded-md border border-input/80 bg-background px-2.5 text-sm shadow-sm",
  "placeholder:text-muted-foreground/55",
  "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
  "disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground",
);

export const productFormInputMonoClass = cn(
  productFormInputClass,
  "font-mono text-xs",
);

export const productFormSelectClass = cn(
  productFormInputClass,
  "cursor-pointer py-0",
);

export const productFormTextareaClass = cn(
  productFormInputClass,
  "h-auto min-h-[4.25rem] resize-y py-2 leading-snug",
);

export const productFormLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

export const productFormFieldClass = "flex min-w-0 flex-col gap-1";

export const productFormGrid2Class = "grid grid-cols-1 gap-2 sm:grid-cols-2";

export const productFormGrid3Class = "grid grid-cols-1 gap-2 sm:grid-cols-3";

export const productFormSectionClass = cn(
  "space-y-2 rounded-lg border border-border/55 bg-muted/10 p-2.5",
);

export const productFormSectionTitleClass =
  "text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/70";

/** Inline quick-edit strip in the detail panel */
export const productFormInlineEditClass = cn(
  "border-l-2 border-primary/40 bg-primary/[0.04] px-2.5 py-2",
  "ring-1 ring-inset ring-primary/12",
);

export const productFormStackClass = "flex flex-col gap-3";

export const productFormDrawerStackClass = "flex flex-col gap-3";

export const productFormSectionBodyClass = cn(
  "space-y-3 rounded-xl border border-border/55 bg-background/60 p-3.5",
  "ring-1 ring-inset ring-black/[0.02] dark:ring-white/[0.04]",
);

export const productFormSectionToggleClass = cn(
  "group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
);

export const productFormDrawerHeroClass = cn(
  "flex items-start gap-3 rounded-xl border border-border/55 p-3",
  "bg-gradient-to-br from-muted/40 via-background to-background shadow-sm",
  "ring-1 ring-inset ring-black/[0.02] dark:from-muted/25 dark:ring-white/[0.04]",
);

export const productFormToggleCardClass = cn(
  "flex cursor-pointer items-start gap-3 rounded-xl border border-border/55 px-3.5 py-3 transition-colors",
  "has-[:checked]:border-primary/30 has-[:checked]:bg-primary/[0.05] has-[:checked]:ring-1 has-[:checked]:ring-primary/15",
  "hover:bg-muted/25",
);

/** Live preview line under stock / cost inputs */
export const productFormPreviewClass =
  "text-[10px] leading-snug text-muted-foreground";
