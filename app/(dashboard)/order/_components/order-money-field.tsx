"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const DRAFT = /^\d*\.?\d{0,4}$/;

function formatAmount(amount: number): string {
  if (!(amount > 0)) return "";
  const rounded = Math.round(amount * 10000) / 10000;
  if (rounded > 0) return String(rounded);
  return amount.toFixed(6).replace(/\.?0+$/, "") || "0";
}

/**
 * Handwritten money. Keeps a local draft so a sibling field (unit vs line)
 * can update the committed amount without stealing the caret.
 */
export function OrderMoneyField({
  amount,
  onCommit,
  ariaLabel,
  className,
  placeholder = "0",
  disabled = false,
}: {
  amount: number;
  onCommit: (amount: number) => void;
  ariaLabel: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const focusedRef = useRef(false);
  const [draft, setDraft] = useState(() => formatAmount(amount));

  useEffect(() => {
    if (!focusedRef.current) setDraft(formatAmount(amount));
  }, [amount]);

  const commitDraft = (raw: string) => {
    const canonical = formatAmount(amount);
    if (raw === canonical) return;
    const n = Number.parseFloat(raw);
    if (raw === "" || raw === "." || !Number.isFinite(n) || n <= 0) {
      onCommit(0);
      setDraft("");
      return;
    }
    onCommit(n);
    setDraft(formatAmount(n));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      enterKeyHint="done"
      disabled={disabled}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        "min-w-0 bg-transparent text-right font-mono font-semibold tabular-nums leading-none text-current outline-none",
        "rounded-[2px] border border-transparent px-1",
        "caret-[var(--pos-primary,#1D4B3B)]",
        "placeholder:font-medium placeholder:text-[var(--op-muted,#556159)]",
        "selection:bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_22%,transparent)]",
        "focus:border-[var(--pos-primary,#1D4B3B)] focus:bg-[var(--order-shelf,#FCFAF5)]",
        "disabled:cursor-default disabled:opacity-60",
        className,
      )}
      onFocus={(e) => {
        focusedRef.current = true;
        e.currentTarget.select();
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        if (raw !== "" && !DRAFT.test(raw)) return;
        setDraft(raw);
        if (raw === "" || raw === "." || raw.endsWith(".")) return;
        const n = Number.parseFloat(raw);
        if (Number.isFinite(n)) onCommit(Math.max(0, n));
      }}
      onBlur={() => {
        focusedRef.current = false;
        commitDraft(draft);
      }}
    />
  );
}
