"use client";

import { cn } from "@/lib/utils";

export type LedgerFnKey = {
  code: string;
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
};

type LedgerFunctionBarProps = {
  keys: LedgerFnKey[];
};

export function LedgerFunctionBar({ keys }: LedgerFunctionBarProps) {
  return (
    <div className="flex min-w-0 flex-1 items-stretch gap-1">
      {keys.map((key) => (
        <button
          key={key.code}
          type="button"
          disabled={key.disabled}
          onClick={key.onPress}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-start justify-center rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1.5 text-left",
            "hover:bg-zinc-50 active:scale-[0.99]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary)]",
            "disabled:opacity-40",
          )}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {key.code}
          </span>
          <span className="truncate text-xs font-medium text-zinc-800">
            {key.label}
            {key.hint ? (
              <span className="font-normal text-zinc-500"> {key.hint}</span>
            ) : null}
          </span>
        </button>
      ))}
    </div>
  );
}
