"use client";

import { dashboardInputClass, dashboardSelectClass } from "@/components/dashboard-page-ui";
import {
  ADVANCE_REPAYMENT_MODES,
  type AdvanceRepaymentMode,
} from "@/lib/payroll-utils";
import { cn } from "@/lib/utils";

type Props = {
  mode: AdvanceRepaymentMode;
  value: string;
  onModeChange: (mode: AdvanceRepaymentMode) => void;
  onValueChange: (value: string) => void;
  balancePreview?: number | null;
  className?: string;
};

export function AdvanceRepaymentArrangement({
  mode,
  value,
  onModeChange,
  onValueChange,
  balancePreview,
  className,
}: Props) {
  const selected = ADVANCE_REPAYMENT_MODES.find((m) => m.value === mode)
    ?? ADVANCE_REPAYMENT_MODES[0];

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Repayment arrangement</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          How much to deduct from salary each pay run until this advance is cleared.
        </p>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {ADVANCE_REPAYMENT_MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              "rounded-lg border px-3 py-2 text-left transition-colors",
              mode === option.value
                ? "border-primary/40 bg-primary/5"
                : "border-border/60 bg-muted/20 hover:bg-muted/35",
            )}
            onClick={() => onModeChange(option.value)}
          >
            <span className="block text-xs font-medium">{option.label}</span>
            <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
              {option.hint}
            </span>
          </button>
        ))}
      </div>

      {selected.needsValue ? (
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          {selected.valueLabel}
          <input
            type="number"
            min="0"
            max={selected.valueMax}
            step={mode === "percent_of_original" ? "1" : "0.01"}
            className={dashboardInputClass()}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={selected.valuePlaceholder}
          />
        </label>
      ) : null}

      {balancePreview != null ? (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Balance after save:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {balancePreview.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function AdvanceRepaymentModeSelect({
  mode,
  onModeChange,
  className,
}: {
  mode: AdvanceRepaymentMode;
  onModeChange: (mode: AdvanceRepaymentMode) => void;
  className?: string;
}) {
  return (
    <select
      className={cn(dashboardSelectClass(), className)}
      value={mode}
      onChange={(e) => onModeChange(e.target.value as AdvanceRepaymentMode)}
    >
      {ADVANCE_REPAYMENT_MODES.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
