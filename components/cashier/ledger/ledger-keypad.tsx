"use client";

import { Delete } from "lucide-react";

import { cn } from "@/lib/utils";

type LedgerKeypadProps = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onEnter: () => void;
  disabled?: boolean;
  targetLabel?: string;
  enterLabel?: string;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"] as const;

const KEY_BASE = cn(
  "flex min-h-[3.25rem] items-center justify-center rounded-none border",
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-card",
  "transition-colors duration-100",
  "hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]",
  "active:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
  "focus-visible:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_45%,transparent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)]",
  "disabled:opacity-40",
  "dark:border-border/40",
);

/**
 * Counter keypad. Numerals use the condensed heading face so a run of digits
 * reads like a figure on a receipt — and the strip above always names what the
 * next keystroke will edit, so the pad is never a mystery.
 */
export function LedgerKeypad({
  onDigit,
  onBackspace,
  onClear,
  onEnter,
  disabled = false,
  targetLabel,
  enterLabel = "Enter",
}: LedgerKeypadProps) {
  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex items-baseline gap-1.5 border px-2 py-1",
          targetLabel
            ? "border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_7%,var(--card))]"
            : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]",
        )}
      >
        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Keypad
        </span>
        <span
          aria-live="polite"
          className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--pos-ink,#1c1915)]"
        >
          {targetLabel ?? "Whole sale"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onDigit(key)}
            className={cn(
              KEY_BASE,
              "pos-market-section-label text-[1.5rem] leading-none tabular-nums",
            )}
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          aria-label="Backspace"
          className={cn(KEY_BASE, "text-muted-foreground")}
        >
          <Delete className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className={cn(
            KEY_BASE,
            "border-red-500/30 bg-red-500/5 text-[13px] font-semibold text-red-700",
            "hover:bg-red-500/10 active:bg-red-500/15",
            "focus-visible:ring-red-400/40 dark:text-red-300",
          )}
        >
          Clear
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onEnter}
          className={cn(
            KEY_BASE,
            "col-span-2 border-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_14%,var(--card))]",
            "text-[13px] font-bold tracking-tight text-[var(--pos-ink,#1c1915)]",
            "hover:bg-[color-mix(in_srgb,var(--pos-primary)_22%,var(--card))]",
          )}
        >
          {enterLabel}
        </button>
      </div>
    </div>
  );
}
