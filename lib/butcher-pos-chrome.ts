/** Shared butcher counter chrome — uses {@link posBrandThemeStyle} CSS variables. */

export const butcherInputClass =
  "h-11 w-full rounded-xl border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-input)/0.9)] px-3 text-sm text-[rgb(var(--bp-fg))] placeholder:text-[rgb(var(--bp-fg-muted))] " +
  "focus:border-[color-mix(in_srgb,var(--pos-primary)_42%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pos-primary)_18%,transparent)]";

export const butcherPillBase =
  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition touch-manipulation";

export function butcherPillClass(active: boolean): string {
  return active
    ? `${butcherPillBase} border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)] text-[var(--pos-primary)]`
    : `${butcherPillBase} border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-surface)/0.8)] text-[rgb(var(--bp-fg-faint))] hover:border-[rgb(var(--bp-border))] hover:text-[rgb(var(--bp-fg-soft))]`;
}

const butcherCategoryRailBase =
  "w-full shrink-0 rounded-lg border px-2.5 py-2.5 text-left text-xs font-semibold leading-snug transition touch-manipulation";

export function butcherCategoryRailClass(active: boolean): string {
  return active
    ? `${butcherCategoryRailBase} border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)] text-[var(--pos-primary)]`
    : `${butcherCategoryRailBase} border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-surface)/0.8)] text-[rgb(var(--bp-fg-faint))] hover:border-[rgb(var(--bp-border))] hover:text-[rgb(var(--bp-fg-soft))]`;
}

export function butcherPayChipClass(active: boolean): string {
  return active
    ? "rounded-lg border border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_18%,transparent)] py-2 text-xs font-semibold text-[var(--pos-primary)]"
    : "rounded-lg border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-surface)/0.8)] py-2 text-xs font-semibold text-[rgb(var(--bp-fg-faint))] hover:border-[rgb(var(--bp-border))] hover:text-[rgb(var(--bp-fg-soft))]";
}

export const butcherChargeButtonClass =
  "h-12 w-full rounded-xl border-0 text-base font-semibold shadow-md transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50";

export const butcherPanelClass =
  "rounded-2xl border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-panel)/0.5)] shadow-xl shadow-black/10 dark:shadow-black/20";

export const butcherDialogClass =
  "border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-bg))] text-[rgb(var(--bp-fg))]";
