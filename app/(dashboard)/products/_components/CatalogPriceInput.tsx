"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { compactListPrice } from "./catalog-price-format";

type Props = {
  value: number | null;
  /** Appended after the value when displaying (e.g. "%"). */
  suffix?: string;
  editable: boolean;
  ariaLabel: string;
  emptyTitle?: string;
  /** Highlight when empty and this is a required commercial field. */
  warnEmpty?: boolean;
  onCommit: (next: number | null) => void | Promise<void>;
};

/**
 * Spreadsheet money / % cell for the catalog list. Always looks like a number;
 * focuses into an input when editable.
 */
export function CatalogPriceInput({
  value,
  suffix = "",
  editable,
  ariaLabel,
  emptyTitle = "Not set",
  warnEmpty = false,
  onCommit,
}: Props) {
  const display =
    value != null && Number.isFinite(value)
      ? `${compactListPrice(value)}${suffix}`
      : "";
  const [draft, setDraft] = useState(display);
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(display);
  }, [display, focused]);

  if (!editable) {
    if (!display) {
      return (
        <span
          className={cn(
            "text-[11px] tabular-nums",
            warnEmpty ? "text-amber-700/70 dark:text-amber-300/70" : "text-foreground/25",
          )}
          title={emptyTitle}
        >
          –
        </span>
      );
    }
    return (
      <span
        className="text-[11px] font-semibold tabular-nums tracking-tight text-foreground"
        title={display}
      >
        {display}
      </span>
    );
  }

  const commit = async () => {
    setFocused(false);
    const raw = draft.trim().replace(/%/g, "").replace(/,/g, "");
    if (!raw) {
      if (value == null) {
        setDraft("");
        return;
      }
      setDraft(display);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      setDraft(display);
      return;
    }
    if (value != null && Math.abs(n - value) < 0.000_5) {
      setDraft(display);
      return;
    }
    setSaving(true);
    try {
      await onCommit(n);
    } finally {
      setSaving(false);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      disabled={saving}
      value={focused ? draft : display || ""}
      placeholder="–"
      title={display || emptyTitle}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onFocus={(e) => {
        setFocused(true);
        setDraft(
          value != null && Number.isFinite(value) ? String(value) : "",
        );
        e.currentTarget.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        void commit();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(display);
          setFocused(false);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn(
        "h-6 w-full min-w-0 rounded-none border border-transparent bg-transparent px-1",
        "text-right text-[11px] font-semibold tabular-nums tracking-tight text-foreground",
        "placeholder:font-normal placeholder:text-foreground/25",
        "hover:border-border/60 hover:bg-white",
        "focus:border-[var(--catalog-primary,#0f766e)] focus:bg-white focus:outline-none",
        "disabled:opacity-60",
        !display && warnEmpty && "text-amber-800 dark:text-amber-200",
      )}
    />
  );
}
