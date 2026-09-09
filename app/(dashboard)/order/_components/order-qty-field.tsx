"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const MAX_QTY = 999_999;

function parseQty(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return null;
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(n, MAX_QTY);
}

export function OrderQtyField({
  qty,
  onSetQty,
  ariaLabel,
  className,
}: {
  qty: number;
  onSetQty: (qty: number) => void;
  ariaLabel: string;
  className?: string;
}) {
  const focusedRef = useRef(false);
  const [draft, setDraft] = useState(String(qty));

  useEffect(() => {
    if (!focusedRef.current) setDraft(String(qty));
  }, [qty]);

  const commit = (raw: string, allowEmpty: boolean) => {
    const parsed = parseQty(raw);
    if (parsed == null) {
      if (allowEmpty) {
        onSetQty(0);
        setDraft("0");
      }
      return;
    }
    onSetQty(parsed);
    setDraft(String(parsed));
  };

  const digits = Math.max(1, draft.length);
  const compact = digits >= 4;

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      enterKeyHint="done"
      maxLength={6}
      value={draft}
      aria-label={ariaLabel}
      title="Type a quantity"
      className={cn(
        "w-full min-w-0 bg-transparent text-center font-heading font-semibold tabular-nums leading-none tracking-normal text-current outline-none",
        compact ? "text-[12px]" : "text-[13px]",
        "selection:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_22%,transparent)]",
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className,
      )}
      onFocus={(e) => {
        focusedRef.current = true;
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const next = e.target.value.replace(/[^\d]/g, "").slice(0, 6);
        setDraft(next);
        const parsed = parseQty(next);
        if (parsed != null) onSetQty(parsed);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        commit(e.currentTarget.value, true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => {
        e.currentTarget.blur();
      }}
    />
  );
}
