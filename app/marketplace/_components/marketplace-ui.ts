export const mktPage =
  "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col";

export const mktHero =
  "relative overflow-hidden border border-border/60 bg-card " +
  "bg-[linear-gradient(180deg,color-mix(in_oklch,var(--muted)_45%,var(--card)),var(--card))]";

export const mktHeroPattern =
  "pointer-events-none absolute inset-0 opacity-[0.28] " +
  "bg-[linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_7%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_7%,transparent)_1px,transparent_1px)] " +
  "bg-[size:24px_24px] [mask-image:linear-gradient(180deg,black,transparent)]";

export const mktSearch =
  "h-12 w-full border border-border/70 bg-background pl-11 pr-4 text-base " +
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
  "inline-flex items-center border border-border/60 bg-background px-2.5 py-1 " +
  "text-[11px] font-medium tracking-wide text-muted-foreground";

export const mktChipActive =
  "border-foreground bg-foreground text-background";

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
