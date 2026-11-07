"use client";

import { useState, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Fields grow to 40px on touch screens; 16px text stops iOS Safari zooming into them. */
export const FIELD_CLASS =
  "h-8 min-w-0 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white px-2 text-[13px] text-[var(--catalog-ink,#121A16)] tabular-nums outline-none transition-colors focus:border-[#1D4B3B] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,#1D4B3B_28%,transparent)] disabled:opacity-40 pointer-coarse:h-10 pointer-coarse:text-[16px]";

type DraftNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number | null;
  /** Returns null while the text is not (yet) a usable number. */
  parse: (text: string) => number | null;
  onValue: (value: number) => void;
  /** Called when the field is left empty; without it the field reverts. */
  onEmpty?: () => void;
};

/**
 * A number field that keeps what the user is typing ("7.", "") instead of
 * snapping it to a parsed value on every keystroke. Valid numbers apply as
 * they are typed; leaving the field tidies it back to the applied value.
 */
export function DraftNumberInput({
  value,
  parse,
  onValue,
  onEmpty,
  className,
  onKeyDown,
  ...rest
}: DraftNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value == null ? "" : String(value));

  function settle() {
    if (draft == null) return;
    const text = draft.trim();
    if (text === "") {
      if (onEmpty) onEmpty();
    } else {
      const parsed = parse(text);
      if (parsed != null) onValue(parsed);
    }
    setDraft(null);
  }

  return (
    <input
      {...rest}
      type="text"
      value={shown}
      className={cn(FIELD_CLASS, className)}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        const parsed = text.trim() === "" ? null : parse(text.trim());
        if (parsed != null) onValue(parsed);
      }}
      onBlur={settle}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          settle();
          event.currentTarget.blur();
        }
        onKeyDown?.(event);
      }}
    />
  );
}

export function rangeParser(min: number, max: number, integer = false) {
  return (text: string): number | null => {
    if (!/^-?\d*(\.\d*)?$/.test(text)) return null;
    const value = Number(text);
    if (!Number.isFinite(value) || value < min || value > max) return null;
    if (integer && !Number.isInteger(value)) return null;
    return value;
  };
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const integer = Number.isInteger(step);
  return (
    <label className="flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.08em] text-[#556159]">
      {label}
      <DraftNumberInput
        value={value}
        inputMode={integer && min >= 0 ? "numeric" : "decimal"}
        parse={rangeParser(min, max, integer)}
        onValue={onChange}
        className="normal-case tracking-normal"
      />
    </label>
  );
}

/** Copies stepper: buttons for touch tills, typing for big runs. */
export function CopiesInput({
  label,
  value,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const stepClass =
    "h-8 w-8 shrink-0 border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)] bg-white text-[15px] leading-none text-[var(--catalog-ink,#121A16)] transition-colors hover:bg-[color-mix(in_srgb,var(--catalog-ink,#121A16)_4%,transparent)] disabled:opacity-40 disabled:hover:bg-white pointer-coarse:h-10 pointer-coarse:w-10";
  return (
    <div className="flex items-center">
      <button
        type="button"
        className={stepClass}
        disabled={disabled || value <= 0}
        aria-label={`One fewer: ${label}`}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <DraftNumberInput
        value={value}
        disabled={disabled}
        inputMode="numeric"
        aria-label={`Copies of ${label}`}
        className="-mx-px w-10 px-0 text-center"
        parse={rangeParser(0, max, true)}
        onValue={onChange}
      />
      <button
        type="button"
        className={stepClass}
        disabled={disabled || value >= max}
        aria-label={`One more: ${label}`}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
