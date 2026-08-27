"use client";

import { cn } from "@/lib/utils";

export function SaStatusSegment({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { value: string; label: string; count: number }[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-nowrap overflow-x-auto rounded-lg border border-[color-mix(in_srgb,var(--sa-ink,#0f172a)_10%,transparent)] bg-[color-mix(in_srgb,var(--sa-shelf,#f1f5f9)_70%,transparent)] p-0.5",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-[var(--sa-ink,#0f172a)] text-white shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_12%,transparent)]"
                : "text-[color-mix(in_srgb,var(--sa-ink,#0f172a)_58%,transparent)] hover:bg-white hover:text-[var(--sa-ink,#0f172a)]",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            <span
              className={cn(
                "tabular-nums",
                active
                  ? "text-[color-mix(in_srgb,#fff_70%,transparent)]"
                  : "text-[color-mix(in_srgb,var(--sa-ink,#0f172a)_42%,transparent)]",
              )}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
