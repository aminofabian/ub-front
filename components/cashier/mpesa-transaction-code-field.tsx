"use client";

import {
  MPESA_TRANSACTION_CODE_LENGTH,
  normalizeMpesaTransactionCode,
} from "@/lib/mpesa-transaction-code";
import { cn } from "@/lib/utils";

export function MpesaTransactionCodeField({
  value,
  onChange,
  locked = false,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Gateway already confirmed this code. */
  locked?: boolean;
  className?: string;
}) {
  const code = normalizeMpesaTransactionCode(value);
  const full = code.length === MPESA_TRANSACTION_CODE_LENGTH;
  const hint = locked
    ? "Confirmed by M-Pesa."
    : full
      ? "This sale will record this code."
      : code.length > 0
        ? "10 characters, like QH7X2K9LMX."
        : "From the customer's M-Pesa message. Leave blank to wait for the prompt.";

  return (
    <label className={cn("block", className)}>
      <span className="flex items-baseline justify-between gap-2 text-[11px] font-medium text-[var(--op-muted,#556159)]">
        <span>Transaction code</span>
        <span className="font-mono tabular-nums">
          {code.length}/{MPESA_TRANSACTION_CODE_LENGTH}
        </span>
      </span>
      <input
        value={code}
        readOnly={locked}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="done"
        maxLength={MPESA_TRANSACTION_CODE_LENGTH}
        placeholder="QH7X2K9LMX"
        aria-label="M-Pesa transaction code"
        onChange={(e) => {
          if (locked) return;
          onChange(normalizeMpesaTransactionCode(e.target.value));
        }}
        className={cn(
          "mt-1 h-11 w-full rounded-[2px] border bg-[var(--op-surface,#fcfaf5)] px-3 font-mono text-[15px] uppercase tracking-[0.08em] outline-none",
          "placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--op-muted,#556159)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]",
          locked
            ? "border-[var(--op-accent,#1d4b3b)] text-[var(--op-accent,#1d4b3b)]"
            : "border-[var(--op-rule,rgba(18,26,22,0.1))] text-[var(--op-ink,#121a16)]",
        )}
      />
      <span className="mt-1 block text-[11px] leading-snug text-[var(--op-muted,#556159)]">
        {hint}
      </span>
    </label>
  );
}
