export const mktPage =
  "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col";

export const mktHero =
  "relative overflow-hidden border border-border/60 bg-card " +
  "bg-[linear-gradient(180deg,color-mix(in_oklch,var(--muted)_35%,var(--card)),var(--card))]";

export const mktHeroPattern =
  "pointer-events-none absolute inset-0 opacity-[0.2] " +
  "bg-[linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_7%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_7%,transparent)_1px,transparent_1px)] " +
  "bg-[size:20px_20px] [mask-image:linear-gradient(180deg,black,transparent)]";

export const mktSearch =
  "h-10 w-full min-w-0 border border-border/70 bg-background pl-10 pr-9 text-sm " +
  "placeholder:text-muted-foreground/50 " +
  "focus-visible:border-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20";

export const mktTile =
  "group relative flex h-full flex-col overflow-hidden border border-border/55 " +
  "bg-card text-left transition duration-200 ease-out " +
  "hover:border-foreground/35 hover:bg-muted/20 " +
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30 " +
  "data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground/25";

export const mktTileMedia =
  "relative flex h-28 items-end overflow-hidden px-4 pb-3";

export const mktChip =
  "inline-flex shrink-0 items-center rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] " +
  "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] px-2 py-1 " +
  "text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground " +
  "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)] hover:text-[var(--pos-ink,#1c1915)]";

export const mktChipActive =
  "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)] " +
  "hover:border-[var(--pos-primary,#0f766e)] hover:text-[var(--pos-primary-ink,#fff)]";

export const mktPosShell =
  "overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] " +
  "bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)]";

export const mktPosInkBorder =
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]";

export const mktPosPaper =
  "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)]";

export const mktPosAccentBar =
  "absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary,#0f766e)]";

export const mktPosHeader =
  "flex h-8 shrink-0 items-center justify-between rounded-none bg-[var(--pos-primary,#0f766e)] " +
  "px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--pos-primary-ink,#fff)]";

export const mktPosSearch =
  "h-9 w-full rounded-none border-0 bg-transparent pl-8 pr-9 text-[13px] outline-none " +
  "placeholder:text-muted-foreground/50";

export const mktPosTile =
  "group relative flex h-full flex-col overflow-hidden rounded-none border " +
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] " +
  "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] text-left " +
  "transition-[border-color,background-color,box-shadow] duration-150 " +
  "hover:z-[1] hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_32%,transparent)] hover:bg-card " +
  "hover:shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]";

export const mktPanel =
  "flex h-full min-h-0 flex-col overflow-hidden border border-border/60 bg-card";

export const mktBtn =
  "inline-flex h-11 items-center justify-center gap-2 border border-foreground " +
  "bg-foreground px-4 text-sm font-semibold text-background transition " +
  "hover:bg-foreground/90 disabled:pointer-events-none disabled:opacity-50";

export const mktBtnGhost =
  "inline-flex h-11 items-center justify-center gap-2 border border-border " +
  "bg-background px-4 text-sm font-semibold text-foreground transition " +
  "hover:bg-muted disabled:pointer-events-none disabled:opacity-50";
