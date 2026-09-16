"use client";

import { cn } from "@/lib/utils";

export type LedgerFnKey = {
  code: string;
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  attention?: boolean;
};

type LedgerFunctionBarProps = {
  keys: LedgerFnKey[];
};

/** F-key strip. The code badge is a real keyboard key, so it stays mono. */
export function LedgerFunctionBar({ keys }: LedgerFunctionBarProps) {
  return (
    <div className="flex min-w-0 flex-1 items-stretch gap-1">
      {keys.map((key) => (
        <button
          key={key.code}
          type="button"
          disabled={key.disabled}
          onClick={key.onPress}
          title={key.hint ? `${key.label} · ${key.hint}` : key.label}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-none border px-2 py-1.5 text-left transition-colors",
            "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-card",
            "hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] active:scale-[0.99]",
            "focus-visible:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_45%,transparent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_30%,transparent)]",
            "disabled:opacity-40",
            "dark:border-border/40",
            key.attention &&
              "border-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_8%,var(--card))]",
          )}
        >
          <span className="shrink-0 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-1 py-0.5 font-mono text-[9px] font-bold leading-none text-muted-foreground">
            {key.code}
          </span>
          <span className="min-w-0 truncate text-[12px] font-semibold tracking-tight text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]">
            {key.label}
            {key.hint ? (
              <span className="ml-1 font-mono text-[10px] font-normal tabular-nums text-[var(--pos-primary)]">
                {key.hint}
              </span>
            ) : null}
          </span>
        </button>
      ))}
    </div>
  );
}
