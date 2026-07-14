"use client";

import { Scale } from "lucide-react";

import { cn } from "@/lib/utils";

type CashierWeighedToggleProps = {
  weighed: boolean;
  busy?: boolean;
  itemLabel: string;
  onToggle: () => void;
  className?: string;
};

/** Compact cart control: mark / clear sell-by-weight for a line. */
export function CashierWeighedToggle({
  weighed,
  busy = false,
  itemLabel,
  onToggle,
  className,
}: CashierWeighedToggleProps) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onToggle}
      title={weighed ? "Sold by weight (kg) — tap to clear" : "Mark as weighted (kg)"}
      aria-label={
        weighed
          ? `${itemLabel}: sold by weight, tap to sell by unit`
          : `${itemLabel}: mark as weighted`
      }
      aria-pressed={weighed}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded border transition-colors",
        "disabled:opacity-50",
        weighed
          ? "border-[color-mix(in_srgb,var(--pos-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--pos-primary)]"
          : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-background text-muted-foreground hover:border-border hover:text-foreground",
        className,
      )}
    >
      <Scale className="size-3" aria-hidden />
    </button>
  );
}
