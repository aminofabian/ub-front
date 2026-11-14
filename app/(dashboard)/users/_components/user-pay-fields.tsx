"use client";

import { Banknote, Percent, Wallet } from "lucide-react";

import { dashboardInputClass, dashboardSelectClass } from "@/components/dashboard-page-ui";
import type { JoinPayMode } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { JOIN_PAY_MODES } from "@/lib/payroll-utils";
import type { CommissionType } from "@/lib/service-business-api";
import { PAY_MODES, payPlanExample, paysCommission, paysSalary, type PayMode, type PayPlanDraft } from "@/lib/user-pay-plan";
import { cn } from "@/lib/utils";

const kes = (n: number) => formatMoney(n, "KES").replace(/\.00$/, "");
const MODE_ICON: Record<PayMode, typeof Wallet> = { salary: Wallet, commission: Percent, both: Banknote };
/** The price the example is worked on: an ordinary haircut. */
const EXAMPLE_PRICE = 300;

/**
 * "How they are paid" on the new-user form of a shop that sells services: salary, commission, or
 * both. Only the fields of the chosen way are shown, and the commission is spelled out on a real
 * price so the owner sees what the rate means before saving it.
 */
export function UserPayFields({
  pay,
  onPayChange,
  joinPayMode,
  onJoinPayModeChange,
  canSetSalary,
  canSetCommission,
  disabled,
}: {
  pay: PayPlanDraft;
  onPayChange: (next: PayPlanDraft) => void;
  joinPayMode: JoinPayMode;
  onJoinPayModeChange: (mode: JoinPayMode) => void;
  /** May record salaries (payroll). Without it the salary amount is left for someone who can. */
  canSetSalary: boolean;
  /** May set commission plans. Without it the plan is left for someone who can. */
  canSetCommission: boolean;
  disabled: boolean;
}) {
  const example = payPlanExample(pay, EXAMPLE_PRICE);
  const set = (patch: Partial<PayPlanDraft>) => onPayChange({ ...pay, ...patch });
  const label = "flex flex-col gap-1.5 text-xs font-medium text-muted-foreground";

  return (
    <fieldset className="flex flex-col gap-3 sm:col-span-2" disabled={disabled}>
      <legend className="text-xs font-medium text-muted-foreground">How they are paid</legend>

      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="How they are paid">
        {PAY_MODES.map((option) => {
          const Icon = MODE_ICON[option.value];
          const on = pay.mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ mode: option.value })}
              className={cn(
                "flex min-h-[4.25rem] flex-col items-start gap-0.5 rounded-[2px] border px-2.5 py-2 text-left transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent,#1D4B3B)]",
                on
                  ? "border-[var(--op-accent,#1D4B3B)] bg-[var(--op-accent-soft,#F1F4F0)] text-[var(--op-ink,#121A16)]"
                  : "border-[var(--op-rule,rgba(18,26,22,0.12))] hover:border-[var(--op-accent,#1D4B3B)]",
              )}
            >
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                <Icon className={cn("size-3.5", on ? "text-[var(--op-accent,#1D4B3B)]" : "text-muted-foreground")} aria-hidden />
                {option.label}
              </span>
              <span className="text-[11px] font-normal leading-snug text-muted-foreground">{option.blurb}</span>
            </button>
          );
        })}
      </div>

      {paysSalary(pay.mode) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Monthly salary (KSh)
            <input
              className={dashboardInputClass()}
              inputMode="decimal"
              placeholder={canSetSalary ? "e.g. 25,000" : "Set by whoever runs payroll"}
              disabled={!canSetSalary}
              value={pay.salary}
              onChange={(event) => set({ salary: event.target.value.replace(/[^0-9.,]/g, "") })}
            />
            <span className="text-[11px] font-normal text-muted-foreground/90">
              {canSetSalary ? "Leave empty to set it later on Payroll." : "You can add the person now; the amount is set on Payroll."}
            </span>
          </label>
          <label className={label}>
            First month salary
            <select
              className={dashboardSelectClass()}
              value={joinPayMode}
              onChange={(event) => onJoinPayModeChange(event.target.value as JoinPayMode)}
              aria-label="First month salary calculation for new user"
            >
              {JOIN_PAY_MODES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-[11px] font-normal text-muted-foreground/90">Salaries unlock on the 25th of each month.</span>
          </label>
        </div>
      ) : null}

      {paysCommission(pay.mode) ? (
        canSetCommission ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              They earn
              <select
                className={dashboardSelectClass()}
                value={pay.commissionType}
                onChange={(event) => set({ commissionType: event.target.value as CommissionType })}
              >
                <option value="PERCENT">A percent of each service</option>
                <option value="FIXED">A fixed amount for each service</option>
              </select>
            </label>
            <label className={label}>
              {pay.commissionType === "PERCENT" ? "Percent of each service" : "Amount for each service (KSh)"}
              <input
                className={dashboardInputClass()}
                inputMode="decimal"
                placeholder={pay.commissionType === "PERCENT" ? "e.g. 40" : "e.g. 100"}
                value={pay.commissionRate}
                onChange={(event) => set({ commissionRate: event.target.value.replace(/[^0-9.]/g, "") })}
              />
            </label>
            <p className="text-[12px] text-foreground sm:col-span-2" role="status">
              {example
                ? `On a ${kes(EXAMPLE_PRICE)} service they earn ${kes(example.theirs)} and the shop keeps ${kes(example.shop)}.`
                : "Type a rate to see what it means on a real price."}
              {pay.mode === "both" ? " This is on top of their salary." : ""}
            </p>
            <label className={cn(label, "sm:col-span-2")}>
              On products they sell (percent, optional)
              <input
                className={dashboardInputClass(false, "sm:max-w-[10rem]")}
                inputMode="decimal"
                placeholder="e.g. 5"
                value={pay.productRate}
                onChange={(event) => set({ productRate: event.target.value.replace(/[^0-9.]/g, "") })}
              />
            </label>
          </div>
        ) : (
          <p className="rounded-none bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            You can add the person now. Their commission rate is set on the Commissions page by someone allowed to.
          </p>
        )
      ) : null}
    </fieldset>
  );
}
