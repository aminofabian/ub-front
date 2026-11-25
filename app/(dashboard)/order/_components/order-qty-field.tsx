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

function focusSiblingQty(
  current: HTMLInputElement,
  direction: "next" | "prev",
) {
  const nodes = Array.from(
    document.querySelectorAll<HTMLInputElement>("[data-order-qty]"),
  ).filter((node) => node.offsetParent !== null);
  const index = nodes.indexOf(current);
  if (index < 0) return;
  const target = nodes[index + (direction === "next" ? 1 : -1)];
  if (!target) return;
  target.focus();
  target.select();
}

export function OrderQtyField({
  qty,
  onSetQty,
  ariaLabel,
  className,
  fieldKey,
  advance = false,
}: {
  qty: number;
  onSetQty: (qty: number) => void;
  ariaLabel: string;
  className?: string;
  fieldKey?: string;
  advance?: boolean;
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
      title={
        advance
          ? "Type a quantity. Enter moves to the next product."
          : "Type a quantity"
      }
      data-order-qty={fieldKey}
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
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        commit(e.currentTarget.value, true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || (advance && e.key === "ArrowDown")) {
          e.preventDefault();
          commit(e.currentTarget.value, true);
          if (advance) focusSiblingQty(e.currentTarget, "next");
          else e.currentTarget.blur();
        } else if (advance && e.key === "ArrowUp") {
          e.preventDefault();
          commit(e.currentTarget.value, true);
          focusSiblingQty(e.currentTarget, "prev");
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
