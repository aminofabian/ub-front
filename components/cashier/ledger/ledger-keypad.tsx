"use client";

import { Delete } from "lucide-react";

import { cn } from "@/lib/utils";

type LedgerKeypadProps = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onEnter: () => void;
  disabled?: boolean;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"] as const;

export function LedgerKeypad({
  onDigit,
  onBackspace,
  onClear,
  onEnter,
  disabled = false,
}: LedgerKeypadProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(key)}
          className={cn(
            "h-11 rounded-md border border-zinc-200 bg-white text-lg font-semibold tabular-nums text-zinc-800",
            "hover:bg-zinc-50 active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary)]",
            "disabled:opacity-40",
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
        className={cn(
          "flex h-11 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700",
          "hover:bg-zinc-50 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary)]",
          "disabled:opacity-40",
        )}
      >
        <Delete className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onClear}
        className={cn(
          "col-span-1 h-10 rounded-md border border-red-200 bg-red-50 text-sm font-semibold text-red-800",
          "hover:bg-red-100 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400",
          "disabled:opacity-40",
        )}
      >
        Clear
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onEnter}
        className={cn(
          "col-span-2 h-10 rounded-md border border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)]",
          "bg-[color-mix(in_srgb,var(--pos-primary)_14%,white)] text-sm font-semibold",
          "text-[var(--pos-ink,#14532d)]",
          "hover:bg-[color-mix(in_srgb,var(--pos-primary)_22%,white)] active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary)]",
          "disabled:opacity-40",
        )}
      >
        Enter
      </button>
    </div>
  );
}
