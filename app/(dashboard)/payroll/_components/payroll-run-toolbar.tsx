"use client";

import { Download, Loader2, Scale, Wallet } from "lucide-react";

import {
  dashboardSelectClass,
  DASHBOARD_SECTION_SURFACE,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPayrollMoney, payrollMonthLabel } from "@/lib/payroll-utils";

type BranchOption = { id: string; name: string };

type Props = {
  year: number;
  month: number;
  branches: BranchOption[];
  branchFilter: string;
  onBranchFilterChange: (value: string) => void;
  applyStatutory: boolean;
  onApplyStatutoryChange: (value: boolean) => void;
  postExpenseDefault: boolean;
  onPostExpenseChange: (value: boolean) => void;
  pendingCount: number;
  canRunPayroll: boolean;
  payingAll: boolean;
  payingId: string | null;
  onPayAll: () => void;
  onExport?: () => void;
  hasRows: boolean;
};

export function PayrollRunToolbar({
  year,
  month,
  branches,
  branchFilter,
  onBranchFilterChange,
  applyStatutory,
  onApplyStatutoryChange,
  postExpenseDefault,
  onPostExpenseChange,
  pendingCount,
  canRunPayroll,
  payingAll,
  payingId,
  onPayAll,
  onExport,
  hasRows,
}: Props) {
  return (
    <div className={cn(DASHBOARD_SECTION_SURFACE, "space-y-4 p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Pay run controls</p>
          <p className="text-xs text-muted-foreground">
            {payrollMonthLabel(year, month)} · bulk settings apply to Pay all
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasRows && onExport ? (
            <Button type="button" variant="outline" size="sm" onClick={onExport}>
              <Download className="mr-1.5 size-3.5" aria-hidden />
              Export CSV
            </Button>
          ) : null}
          {canRunPayroll && pendingCount > 0 ? (
            <Button
              type="button"
              size="sm"
              disabled={payingAll || payingId != null}
              onClick={onPayAll}
            >
              {payingAll ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                  Paying all…
                </>
              ) : (
                <>Pay all pending ({pendingCount})</>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(10rem,1fr)_1fr_1fr]">
        {branches.length > 0 ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Branch filter
            <select
              className={dashboardSelectClass(false)}
              value={branchFilter}
              onChange={(e) => onBranchFilterChange(e.target.value)}
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div />
        )}

        <ToggleCard
          active={applyStatutory}
          icon={<Scale className="size-4" aria-hidden />}
          title="Kenya statutory"
          description="PAYE, NSSF, SHIF, Housing Levy on pay all"
          onClick={() => onApplyStatutoryChange(!applyStatutory)}
        />

        <ToggleCard
          active={postExpenseDefault}
          icon={<Wallet className="size-4" aria-hidden />}
          title="Post to finance"
          description="Record net salary as expense when paying all"
          onClick={() => onPostExpenseChange(!postExpenseDefault)}
        />
      </div>
    </div>
  );
}

function ToggleCard({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
          : "border-border/60 bg-muted/20 hover:bg-muted/30",
      )}
      onClick={onClick}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <span
        className={cn(
          "ml-auto mt-1 size-2 shrink-0 rounded-full",
          active ? "bg-primary" : "bg-muted-foreground/30",
        )}
        aria-hidden
      />
    </button>
  );
}
