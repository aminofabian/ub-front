"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type StockFilterOption<T extends string = string> = {
  value: T;
  label: string;
  /** Optional muted trailing meta (e.g. counts). */
  meta?: string;
};

type StockFilterMenuProps<T extends string> = {
  value: T;
  options: readonly StockFilterOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name for the trigger. */
  label: string;
  disabled?: boolean;
  className?: string;
  /** Align the panel to the trigger’s end edge (useful near the right of the toolbar). */
  align?: "start" | "end";
  /** Wider panel for longer option labels (e.g. supplier names). */
  wide?: boolean;
};

/**
 * Light stockroom filter / sort menu — avoids native OS dark pickers on mobile.
 */
export function StockFilterMenu<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
  className,
  align = "start",
  wide = false,
}: StockFilterMenuProps<T>) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-7 w-full min-w-0 items-center justify-between gap-1",
          "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
          "px-2 text-left text-[11px] tracking-[-0.01em] text-[var(--order-ink,#15231f)]",
          "transition-[border-color,background-color] duration-150",
          "hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)]",
          "focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-[var(--pos-primary,#0f766e)]",
        )}
      >
        <span className="min-w-0 truncate font-medium">
          {selected?.label ?? "…"}
          {selected?.meta ? (
            <span className="ml-1 font-normal text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
              · {selected.meta}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)] transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute top-[calc(100%+4px)] z-40 overflow-hidden",
            "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white",
            "shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--order-ink,#15231f)_28%,transparent)]",
            wide ? "w-[min(18rem,calc(100vw-1.5rem))]" : "min-w-full w-[12.5rem]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          <p
            className={cn(
              "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
              "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] px-3 py-1.5",
              "text-[9px] font-bold uppercase tracking-[0.14em]",
              "text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]",
            )}
          >
            {label}
          </p>
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-[min(50dvh,16rem)] overflow-y-auto py-1"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => pick(opt.value)}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] tracking-[-0.01em]",
                      "text-[var(--order-ink,#15231f)] transition-colors",
                      "hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]",
                      "focus-visible:outline-none focus-visible:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)]",
                      isSelected &&
                        "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] font-semibold",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center",
                        isSelected
                          ? "text-[var(--pos-primary,#0f766e)]"
                          : "text-transparent",
                      )}
                      aria-hidden
                    >
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                    {opt.meta ? (
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]">
                        {opt.meta}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
