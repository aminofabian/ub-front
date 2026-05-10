/** Stable pastel “category tag” styles for kiosk-style product cards (hash of label). */
const KIOSK_CATEGORY_PILL_PRESETS = [
  "bg-orange-100/90 text-orange-900 dark:bg-orange-950/35 dark:text-orange-100",
  "bg-teal-100/90 text-teal-900 dark:bg-teal-950/35 dark:text-teal-100",
  "bg-amber-100/90 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100",
  "bg-rose-100/90 text-rose-900 dark:bg-rose-950/35 dark:text-rose-100",
  "bg-violet-100/90 text-violet-900 dark:bg-violet-950/35 dark:text-violet-100",
  "bg-sky-100/90 text-sky-900 dark:bg-sky-950/35 dark:text-sky-100",
  "bg-lime-100/90 text-lime-900 dark:bg-lime-950/35 dark:text-lime-100",
] as const;

export function kioskCategoryPillClass(label: string): string {
  const t = label.trim();
  if (!t) {
    return "bg-neutral-200/70 text-neutral-700 dark:bg-muted dark:text-muted-foreground";
  }
  let h = 0;
  for (let i = 0; i < t.length; i++) {
    h = (h + t.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  const idx = Math.abs(h) % KIOSK_CATEGORY_PILL_PRESETS.length;
  return KIOSK_CATEGORY_PILL_PRESETS[idx];
}
