/** Stable pastel “category tag” styles for kiosk-style product cards (hash of label). */
const KIOSK_CATEGORY_PILL_PRESETS = [
  "bg-orange-100/90 text-orange-900 dark:bg-orange-950/35 dark:text-orange-100",
  "bg-teal-100/90 text-teal-900 dark:bg-teal-950/35 dark:text-teal-100",
  "bg-amber-100/90 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100",
  "bg-rose-100/90 text-rose-900 dark:bg-rose-950/35 dark:text-rose-100",
  "bg-cyan-100/90 text-cyan-900 dark:bg-cyan-950/35 dark:text-cyan-100",
  "bg-sky-100/90 text-sky-900 dark:bg-sky-950/35 dark:text-sky-100",
  "bg-lime-100/90 text-lime-900 dark:bg-lime-950/35 dark:text-lime-100",
] as const;

/** Ink-wash backgrounds for no-image product / aisle placeholders (market till). */
const KIOSK_PLACEHOLDER_WASH_PRESETS = [
  "from-[#efeae0] to-[#e4ddd1] text-[#5c5348]/40] dark:from-muted/50 dark:to-muted/70 dark:text-muted-foreground/45",
  "from-[#e7ede8] to-[#d8e1da] text-[#3f5248]/40] dark:from-muted/50 dark:to-muted/70 dark:text-muted-foreground/45",
  "from-[#f0e5dd] to-[#e5d6cc] text-[#5a4740]/40] dark:from-muted/50 dark:to-muted/70 dark:text-muted-foreground/45",
  "from-[#ece8df] to-[#dfd9cd] text-[#555040]/40] dark:from-muted/50 dark:to-muted/70 dark:text-muted-foreground/45",
  "from-[#e6ecec] to-[#d6e0e0] text-[#3e4d54]/40] dark:from-muted/50 dark:to-muted/70 dark:text-muted-foreground/45",
] as const;

function hashLabel(label: string): number {
  const t = label.trim();
  let h = 0;
  for (let i = 0; i < t.length; i++) {
    h = (h + t.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return Math.abs(h);
}

export function kioskCategoryPillClass(label: string): string {
  const t = label.trim();
  if (!t) {
    return "bg-neutral-200/70 text-neutral-700 dark:bg-muted dark:text-muted-foreground";
  }
  const idx = hashLabel(t) % KIOSK_CATEGORY_PILL_PRESETS.length;
  return KIOSK_CATEGORY_PILL_PRESETS[idx];
}

/** Deterministic ink-wash classes for placeholder tile media (pair with `bg-gradient-to-br`). */
export function kioskPlaceholderWashClass(label: string): string {
  const t = label.trim();
  if (!t) {
    return "from-neutral-100 to-neutral-200/80 text-neutral-400/50 dark:from-muted/40 dark:to-muted/60 dark:text-muted-foreground/40";
  }
  const idx = hashLabel(t) % KIOSK_PLACEHOLDER_WASH_PRESETS.length;
  return KIOSK_PLACEHOLDER_WASH_PRESETS[idx];
}
