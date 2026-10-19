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
      placeholder="—"
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
        "h-14 w-[5.5rem] shrink-0 rounded-[2px] border bg-[var(--op-surface,#fcfaf5)] px-2.5 text-right text-[22px] font-semibold tabular-nums tracking-tight transition-[border-color,box-shadow]",
        "placeholder:text-[color-mix(in_srgb,var(--op-ink,#121a16)_22%,transparent)]",
        "focus:outline-none focus:ring-4",
        COUNT_TONE.ink,
        invalid
          ? "border-[var(--op-highlight,#a55237)] focus:ring-[color-mix(in_srgb,var(--op-highlight,#a55237)_18%,transparent)]"
          : "focus:border-[var(--op-accent,#1d4b3b)] focus:ring-[color-mix(in_srgb,var(--op-accent,#1d4b3b)_16%,transparent)]",
        !invalid && savedQty != null
          ? "border-[color-mix(in_srgb,var(--op-accent,#1d4b3b)_42%,var(--op-surface,#fcfaf5))]"
          : null,
        !invalid && savedQty == null ? COUNT_TONE.hair : null,
      )}
    />
  );
}
