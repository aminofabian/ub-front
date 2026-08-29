"use client";

import { dashboardInputClass, dashboardSelectClass } from "@/components/dashboard-page-ui";
import {
  ADVANCE_REPAYMENT_MODES,
  type AdvanceRepaymentMode,
  advanceRepaymentPreview,
  formatPayrollMoney,
  parseRepaymentMoneyInput,
  parseRepaymentPercentInput,
} from "@/lib/payroll-utils";
import { cn } from "@/lib/utils";

const PERCENT_PRESETS = [25, 50, 75, 100] as const;

type Props = {
  mode: AdvanceRepaymentMode;
  value: string;
  onModeChange: (mode: AdvanceRepaymentMode) => void;
  onValueChange: (value: string) => void;
  /** Original advance amount — used for % preview */
  originalAmount?: number | null;
  /** Current balance — used for preview */
  balanceOutstanding?: number | null;
  balancePreview?: number | null;
  className?: string;
};

export function AdvanceRepaymentArrangement({
  mode,
  value,
  onModeChange,
  onValueChange,
  originalAmount,
  balanceOutstanding,
  balancePreview,
  className,
}: Props) {
  const previewAdvance = {
    amount: originalAmount ?? 0,
    balanceOutstanding: balanceOutstanding ?? balancePreview ?? originalAmount ?? 0,
    repaymentMode: mode,
    repaymentValue: Number(parseRepaymentPercentInput(value)) || Number(parseRepaymentMoneyInput(value)) || 0,
  };

  const preview = advanceRepaymentPreview(previewAdvance, mode, value);
  const parsedPercent = Number(parseRepaymentPercentInput(value)) || 0;

  function selectPercent(pct: number) {
    onModeChange("percent_of_original");
    onValueChange(String(pct));
  }

  function handlePercentInput(raw: string) {
    onModeChange("percent_of_original");
    onValueChange(parseRepaymentPercentInput(raw));
  }

  function handleFixedInput(raw: string) {
    onModeChange("fixed_per_pay");
    onValueChange(parseRepaymentMoneyInput(raw));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Repayment arrangement</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          How much comes off salary each pay run until this advance is cleared.
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Quick % of original</p>
        <div className="flex flex-wrap gap-1.5">
          {PERCENT_PRESETS.map((pct) => (
            <button
              key={pct}
              type="button"
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors",
                mode === "percent_of_original" && parsedPercent === pct
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/25 hover:bg-muted/45",
              )}
              onClick={() => selectPercent(pct)}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {mode === "percent_of_original" ? (
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Percent of original amount
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              className={cn(dashboardInputClass(), "pr-8 tabular-nums")}
              value={value}
              onChange={(e) => handlePercentInput(e.target.value)}
              placeholder="50"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              %
            </span>
          </div>
        </label>
      ) : null}

      <div className="grid gap-1.5 sm:grid-cols-2">
        {ADVANCE_REPAYMENT_MODES.filter((m) => m.value !== "percent_of_original").map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              "rounded-lg border px-3 py-2 text-left transition-colors",
              mode === option.value
                ? "border-primary/40 bg-primary/5"
                : "border-border/60 bg-muted/20 hover:bg-muted/35",
            )}
            onClick={() => {
              onModeChange(option.value);
              if (option.value === "full_balance" || option.value === "manual") {
                onValueChange("");
              }
            }}
          >
            <span className="block text-xs font-medium">{option.label}</span>
            <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
              {option.hint}
            </span>
          </button>
        ))}
      </div>

      {mode === "fixed_per_pay" ? (
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Fixed amount each pay
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
              KES
            </span>
            <input
              type="text"
              inputMode="decimal"
              className={cn(dashboardInputClass(), "pl-11 tabular-nums")}
              value={value}
              onChange={(e) => handleFixedInput(e.target.value)}
              placeholder="5,000"
            />
          </div>
        </label>
      ) : null}

      {preview.summary ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs">
          <p className="font-medium text-foreground">{preview.summary}</p>
          {preview.perPay > 0 ? (
            <p className="mt-1 text-muted-foreground">
              Next pay deduction:{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatPayrollMoney(preview.perPay)}
              </span>
              {preview.paysRemaining != null && preview.paysRemaining > 0 ? (
                <>
                  {" "}
                  · clears in ~{preview.paysRemaining} pay
                  {preview.paysRemaining === 1 ? "" : "s"}
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}

      {balancePreview != null ? (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Balance after save:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatPayrollMoney(balancePreview)}
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
