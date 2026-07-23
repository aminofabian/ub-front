/** Shared butcher counter chrome — uses {@link posBrandThemeStyle} CSS variables. */

export const butcherInputClass =
  "h-10 w-full rounded-none border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-surface))] px-3 text-sm text-[rgb(var(--bp-fg))] placeholder:text-[rgb(var(--bp-fg-muted))] " +
  "focus:border-[var(--pos-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--pos-primary)]";

export const butcherPillBase =
  "shrink-0 rounded-none border px-3 py-1.5 text-xs font-semibold transition touch-manipulation";

export function butcherPillClass(active: boolean): string {
  return active
    ? `${butcherPillBase} border-[var(--pos-primary)] bg-[var(--pos-primary)] text-[var(--pos-primary-ink)]`
    : `${butcherPillBase} border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-surface))] text-[rgb(var(--bp-fg-faint))] hover:bg-[rgb(var(--bp-hover))] hover:text-[rgb(var(--bp-fg-soft))]`;
}

const butcherCategoryRailBase =
  "flex aspect-square w-full shrink-0 items-center justify-center rounded-none border px-1 text-center text-[11px] font-semibold leading-tight transition touch-manipulation";

export function butcherCategoryRailClass(active: boolean): string {
  return active
    ? `${butcherCategoryRailBase} border-[var(--pos-primary)] bg-[var(--pos-primary)] text-[var(--pos-primary-ink)]`
    : `${butcherCategoryRailBase} border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-surface))] text-[rgb(var(--bp-fg))] hover:bg-[rgb(var(--bp-hover))]`;
}

export const butcherCategoryHeaderClass =
  "flex h-10 shrink-0 items-center justify-center rounded-none bg-[var(--pos-primary)] px-2 text-center text-xs font-bold uppercase tracking-wide text-[var(--pos-primary-ink)]";

export function butcherPayChipClass(active: boolean): string {
  return active
    ? "rounded-none border border-[var(--pos-primary)] bg-[var(--pos-primary)] py-2 text-xs font-semibold text-[var(--pos-primary-ink)]"
    : "rounded-none border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-surface))] py-2 text-xs font-semibold text-[rgb(var(--bp-fg-faint))] hover:bg-[rgb(var(--bp-hover))] hover:text-[rgb(var(--bp-fg-soft))]";
}

export const butcherChargeButtonClass =
  "h-14 w-full rounded-none border-0 text-base font-bold tracking-wide shadow-none transition hover:brightness-110 active:brightness-95 disabled:opacity-50";

export const butcherPanelClass =
  "rounded-none border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-surface))]";

export const butcherDialogClass =
  "rounded-none border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-bg))] text-[rgb(var(--bp-fg))]";
