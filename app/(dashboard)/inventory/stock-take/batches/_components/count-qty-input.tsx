"use client";

import { useRef, useState } from "react";

import { parseCountInput } from "@/lib/count-cycle/parse-count-input";
import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";

type Props = {
  label: string;
  savedQty: number | string | null;
  inputRef: (input: HTMLInputElement | null) => void;
  onCommit: (qty: number) => Promise<boolean>;
  onNext: () => void;
};

function asDraft(qty: number | string | null): string {
  return qty == null ? "" : String(Number(qty));
}

/** Thumb-sized count box: saves on blur, Enter saves and moves to the next product. */
export function CountQtyInput({ label, savedQty, inputRef, onCommit, onNext }: Props) {
  const [draft, setDraft] = useState(() => asDraft(savedQty));
  const lastSent = useRef<number | null>(savedQty == null ? null : Number(savedQty));
  const parsed = parseCountInput(draft);
  const invalid = draft.trim() !== "" && parsed == null;

  const commit = () => {
    if (parsed == null || parsed === lastSent.current) return;
    const previous = lastSent.current;
    lastSent.current = parsed;
    void onCommit(parsed).then((saved) => {
      if (!saved) lastSent.current = previous;
    });
  };

  return (
    <input
      ref={inputRef}
      aria-label={label}
      aria-invalid={invalid || undefined}
      inputMode="decimal"
      enterKeyHint="next"
      autoComplete="off"
      placeholder="0"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        commit();
        onNext();
      }}
      className={cn(
        "h-12 w-[84px] shrink-0 rounded-xl border bg-white px-3 text-right font-heading text-[20px] font-semibold tabular-nums transition-[border-color,box-shadow] placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_25%,transparent)] focus:outline-none focus:ring-4",
        COUNT_TONE.ink,
        invalid
          ? "border-red-500 focus:ring-red-500/15"
          : "focus:border-[var(--pos-primary,#0f766e)] focus:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_16%,transparent)]",
        !invalid && savedQty != null ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,white)]" : null,
        !invalid && savedQty == null ? COUNT_TONE.hair : null,
      )}
    />
  );
}
