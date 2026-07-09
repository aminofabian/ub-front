export const mktPage =
  "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col";

export const mktHero =
  "relative overflow-hidden rounded-2xl border border-border/50 bg-card " +
  "bg-[radial-gradient(120%_90%_at_0%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_55%),radial-gradient(80%_70%_at_100%_10%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_50%),linear-gradient(180deg,color-mix(in_oklch,var(--card)_96%,var(--muted)),var(--card))]";

export const mktHeroPattern =
  "pointer-events-none absolute inset-0 opacity-[0.35] " +
  "bg-[linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px)] " +
  "bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]";

export const mktSearch =
  "h-14 w-full rounded-2xl border border-border/60 bg-background/90 pl-12 pr-4 text-base shadow-sm " +
  "backdrop-blur-sm placeholder:text-muted-foreground/50 " +
  "focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

export const mktTile =
  "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 " +
  "bg-card text-left shadow-sm transition duration-300 ease-out " +
  "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 " +
  "data-[selected=true]:border-primary/50 data-[selected=true]:ring-2 data-[selected=true]:ring-primary/20";

export const mktTileMedia =
  "relative flex h-28 items-end overflow-hidden px-4 pb-3";

export const mktChip =
  "inline-flex items-center rounded-md border border-border/50 bg-background/70 px-2 py-0.5 " +
  "text-[11px] font-medium tracking-wide text-muted-foreground backdrop-blur-sm";

export const mktChipActive = "border-primary/40 bg-primary/10 text-primary";

export const mktPanel =
  "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/55 bg-card shadow-sm";
