"use client";

import {
  Building2,
  Minus,
  Smartphone,
  Store,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  HAIRLINE,
  supFormCellInput,
  supFormCellTextarea,
} from "./supplier-ui-tokens";

export type SupplierPayoutType =
  | "manual"
  | "mobile_wallet"
  | "till"
  | "paybill";

export type SupplierPayoutValues = {
  payoutType: string;
  payoutPhone: string;
  payoutTillNumber: string;
  payoutPaybillNumber: string;
  payoutPaybillAccount: string;
  paymentDetails?: string;
};

/** Clear fields that do not belong to the newly chosen payout method. */
export function payoutTypePatch(
  next: string,
): Partial<SupplierPayoutValues> & { payoutType: string } {
  if (next === "manual") {
    return {
      payoutType: next,
      payoutPhone: "",
      payoutTillNumber: "",
      payoutPaybillNumber: "",
      payoutPaybillAccount: "",
    };
  }
  if (next === "mobile_wallet") {
    return {
      payoutType: next,
      payoutTillNumber: "",
      payoutPaybillNumber: "",
      payoutPaybillAccount: "",
    };
  }
  if (next === "till") {
    return {
      payoutType: next,
      payoutPhone: "",
      payoutPaybillNumber: "",
      payoutPaybillAccount: "",
    };
  }
  return { payoutType: next, payoutPhone: "", payoutTillNumber: "" };
}

const METHODS: {
  value: SupplierPayoutType;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    value: "mobile_wallet",
    label: "M-Pesa",
    hint: "Phone",
    icon: Smartphone,
  },
  {
    value: "till",
    label: "Till",
    hint: "Buy Goods",
    icon: Store,
  },
  {
    value: "paybill",
    label: "Paybill",
    hint: "Business no.",
    icon: Building2,
  },
  {
    value: "manual",
    label: "Later",
    hint: "Set anytime",
    icon: Minus,
  },
];

export function payoutSlipLines(values: SupplierPayoutValues): {
  method: string;
  destination: string;
  ready: boolean;
} {
  const type = (values.payoutType || "manual") as SupplierPayoutType;
  if (type === "mobile_wallet") {
    const phone = values.payoutPhone.trim();
    return {
      method: "M-Pesa Send Money",
      destination: phone || "Add a phone number",
      ready: Boolean(phone),
    };
  }
  if (type === "till") {
    const till = values.payoutTillNumber.trim();
    return {
      method: "Till · Buy Goods",
      destination: till ? `Till ${till}` : "Add a till number",
      ready: Boolean(till),
    };
  }
  if (type === "paybill") {
    const bill = values.payoutPaybillNumber.trim();
    const account = values.payoutPaybillAccount.trim();
    return {
      method: "Paybill",
      destination:
        bill || account
          ? `${bill || "—"} · Acc ${account || "—"}`
          : "Add paybill + account",
      ready: Boolean(bill && account),
    };
  }
  return {
    method: "Manual",
    destination: "Record payments by hand",
    ready: false,
  };
}

/**
 * Visual rail for how you pay a supplier — tiles + destination fields +
 * a live slip so the shop sees exactly where money will go.
 */
export function SupplierPayoutChooser({
  values,
  onChange,
  disabled = false,
  showBankNotes = true,
  supplierName,
  compact = false,
  className,
}: {
  values: SupplierPayoutValues;
  onChange: (partial: Partial<SupplierPayoutValues>) => void;
  disabled?: boolean;
  /** Free-text bank / remittance notes under the destination. */
  showBankNotes?: boolean;
  /** Optional name printed on the live slip. */
  supplierName?: string;
  compact?: boolean;
  className?: string;
}) {
  const active = (values.payoutType || "manual") as SupplierPayoutType;
  const slip = payoutSlipLines(values);
  const name = supplierName?.trim();

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="radiogroup"
        aria-label="How you pay this supplier"
        className={cn(
          "grid gap-1.5",
          compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
        )}
      >
        {METHODS.map((opt) => {
          const selected = active === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => {
                if (selected) return;
                onChange(payoutTypePatch(opt.value));
              }}
              className={cn(
                "group relative flex min-h-14 flex-col items-start gap-1 rounded-[2px] border px-2.5 py-2 text-left transition-[border-color,background-color,color] duration-200",
                "ease-[cubic-bezier(0.22,1,0.36,1)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent,#1D4B3B)] focus-visible:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "border-[var(--op-accent,#1D4B3B)] bg-[color-mix(in_srgb,var(--op-accent,#1D4B3B)_8%,var(--op-surface,#FCFAF5))] text-[var(--op-ink,#121A16)]"
                  : cn(
                      "border-[var(--op-rule,rgba(18,26,22,0.10))] bg-[var(--op-surface,#FCFAF5)] text-[var(--op-muted,#556159)]",
                      "hover:border-[color-mix(in_srgb,var(--op-ink,#121A16)_22%,transparent)] hover:text-[var(--op-ink,#121A16)]",
                    ),
              )}
            >
              <Icon
                className={cn(
                  "size-3.5 shrink-0 transition-colors",
                  selected
                    ? "text-[var(--op-accent,#1D4B3B)]"
                    : "text-[color-mix(in_srgb,var(--op-ink,#121A16)_42%,transparent)] group-hover:text-[var(--op-ink,#121A16)]",
                )}
                aria-hidden
              />
              <span className="text-[12px] font-semibold tracking-[-0.02em]">
                {opt.label}
              </span>
              <span
                className={cn(
                  "text-[10px] leading-none",
                  selected
                    ? "text-[color-mix(in_srgb,var(--op-accent,#1D4B3B)_78%,transparent)]"
                    : "text-[color-mix(in_srgb,var(--op-ink,#121A16)_42%,transparent)]",
                )}
              >
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>

      {active !== "manual" ? (
        <div
          className={cn(
            "space-y-2 rounded-[2px] border bg-[var(--op-surface,#FCFAF5)] p-2.5",
            HAIRLINE,
          )}
        >
          {active === "mobile_wallet" ? (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted,#556159)]">
                M-Pesa number
              </span>
              <input
                className={cn(
                  supFormCellInput,
                  "h-11 rounded-[2px] border bg-white px-2.5 tabular-nums sm:h-9",
                  HAIRLINE,
                )}
                value={values.payoutPhone}
                onChange={(e) => onChange({ payoutPhone: e.target.value })}
                maxLength={32}
                placeholder="07XX XXX XXX"
                inputMode="tel"
                autoComplete="tel"
                disabled={disabled}
              />
              <span className="text-[10px] leading-snug text-[color-mix(in_srgb,var(--op-ink,#121A16)_48%,transparent)]">
                SMS verification is optional — a saved number is enough to pay.
              </span>
            </label>
          ) : null}

          {active === "till" ? (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted,#556159)]">
                Till number
              </span>
              <input
                className={cn(
                  supFormCellInput,
                  "h-11 rounded-[2px] border bg-white px-2.5 tabular-nums sm:h-9",
                  HAIRLINE,
                )}
                value={values.payoutTillNumber}
                onChange={(e) => onChange({ payoutTillNumber: e.target.value })}
                maxLength={32}
                placeholder="e.g. 567890"
                inputMode="numeric"
                disabled={disabled}
              />
            </label>
          ) : null}

          {active === "paybill" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted,#556159)]">
                  Paybill number
                </span>
                <input
                  className={cn(
                    supFormCellInput,
                    "h-11 rounded-[2px] border bg-white px-2.5 tabular-nums sm:h-9",
                    HAIRLINE,
                  )}
                  value={values.payoutPaybillNumber}
                  onChange={(e) =>
                    onChange({ payoutPaybillNumber: e.target.value })
                  }
                  maxLength={32}
                  placeholder="e.g. 247247"
                  inputMode="numeric"
                  disabled={disabled}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted,#556159)]">
                  Account / reference
                </span>
                <input
                  className={cn(
                    supFormCellInput,
                    "h-11 rounded-[2px] border bg-white px-2.5 tabular-nums sm:h-9",
                    HAIRLINE,
                  )}
                  value={values.payoutPaybillAccount}
                  onChange={(e) =>
                    onChange({ payoutPaybillAccount: e.target.value })
                  }
                  maxLength={64}
                  placeholder="What the paybill asks for"
                  disabled={disabled}
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      {showBankNotes && values.paymentDetails !== undefined ? (
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-[-0.02em] text-[var(--op-muted,#556159)]">
            Bank or other notes
          </span>
          <textarea
            className={cn(
              supFormCellTextarea,
              "min-h-[4.5rem] rounded-[2px] border bg-white px-2.5 py-2",
              HAIRLINE,
            )}
            value={values.paymentDetails}
            onChange={(e) => onChange({ paymentDetails: e.target.value })}
            maxLength={2000}
            placeholder="Bank name, account number, branch…"
            disabled={disabled}
          />
        </label>
      ) : null}

      <div
        aria-live="polite"
        className={cn(
          "relative overflow-hidden rounded-[2px] border px-3 py-2.5",
          HAIRLINE,
          slip.ready
            ? "bg-[color-mix(in_srgb,var(--op-accent,#1D4B3B)_6%,var(--op-surface,#FCFAF5))]"
            : "bg-[var(--op-panel,#EFEBE2)]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[1.05rem] font-normal leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]"
              style={{
                fontFamily:
                  'var(--font-cormorant), Georgia, "Times New Roman", serif',
              }}
            >
              {name || "This supplier"}
            </p>
            <p className="mt-1.5 text-[10px] font-semibold tracking-[-0.02em] text-[var(--op-muted,#556159)]">
              {slip.method}
            </p>
            <p
              className={cn(
                "mt-0.5 truncate font-mono text-[12px] tabular-nums",
                slip.ready
                  ? "text-[var(--op-ink,#121A16)]"
                  : "text-[color-mix(in_srgb,var(--op-ink,#121A16)_48%,transparent)]",
              )}
            >
              {slip.destination}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-[2px] px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
              slip.ready
                ? "bg-[var(--op-accent,#1D4B3B)] text-[var(--op-surface,#FCFAF5)]"
                : "border border-[var(--op-rule,rgba(18,26,22,0.10))] text-[var(--op-muted,#556159)]",
            )}
          >
            {slip.ready ? "Ready" : "Optional"}
          </span>
        </div>
      </div>
    </div>
  );
}
