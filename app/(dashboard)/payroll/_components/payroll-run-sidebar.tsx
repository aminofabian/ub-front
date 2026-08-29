"use client";

import { Download, Loader2, MessageSquare, Scale, Sparkles, Wallet } from "lucide-react";

import { dashboardSelectClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PayrollAutomationPanel } from "./payroll-automation-panel";

type BranchOption = { id: string; name: string };

type Props = {
  branches: BranchOption[];
  branchFilter: string;
  onBranchFilterChange: (value: string) => void;
  applyStatutory: boolean;
  onApplyStatutoryChange: (value: boolean) => void;
  postExpenseDefault: boolean;
  onPostExpenseChange: (value: boolean) => void;
  pendingCount: number;
  canRunPayroll: boolean;
  canManagePayroll: boolean;
  payingAll: boolean;
  payingId: string | null;
  onPayAll: () => void;
  onOpenSms?: () => void;
  onExport?: () => void;
  hasRows: boolean;
};

export function PayrollRunSidebar({
  branches,
  branchFilter,
  onBranchFilterChange,
  applyStatutory,
  onApplyStatutoryChange,
  postExpenseDefault,
  onPostExpenseChange,
  pendingCount,
  canRunPayroll,
  canManagePayroll,
  payingAll,
  payingId,
  onPayAll,
  onOpenSms,
  onExport,
  hasRows,
}: Props) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
      {canRunPayroll && pendingCount > 0 ? (
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Ready to close the run</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {pendingCount} staff still pending for this period.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="mt-4 w-full"
            disabled={payingAll || payingId != null}
            onClick={onPayAll}
          >
            {payingAll ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
                Processing…
              </>
            ) : (
              <>Pay all ({pendingCount})</>
            )}
          </Button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Run settings
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Applied when you pay all at once.
        </p>

        <div className="mt-4 space-y-2">
          <SettingToggle
            active={applyStatutory}
            icon={<Scale className="size-4" aria-hidden />}
            title="Kenya statutory"
            description="PAYE, NSSF, SHIF, Housing Levy"
            onClick={() => onApplyStatutoryChange(!applyStatutory)}
          />
          <SettingToggle
            active={postExpenseDefault}
            icon={<Wallet className="size-4" aria-hidden />}
            title="Post to finance"
            description="Record net pay as salary expense"
            onClick={() => onPostExpenseChange(!postExpenseDefault)}
          />
        </div>

        {branches.length > 0 ? (
          <label className="mt-4 flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Branch
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
        ) : null}

        {hasRows && onExport ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={onExport}
          >
            <Download className="mr-1.5 size-3.5" aria-hidden />
            Export CSV
          </Button>
        ) : null}

        {canManagePayroll && onOpenSms ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={onOpenSms}
          >
            <MessageSquare className="mr-1.5 size-3.5" aria-hidden />
            SMS staff
          </Button>
        ) : null}
      </div>

      <PayrollAutomationPanel
        canManage={canManagePayroll}
        branches={branches}
        applyStatutory={applyStatutory}
        postExpenseDefault={postExpenseDefault}
        branchFilter={branchFilter}
      />

      <div className="rounded-2xl border border-dashed border-border/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">How this works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Select a staff member from the roster.</li>
          <li>Review salary, advances, and statutory.</li>
          <li>Mark paid — or pay everyone at once.</li>
        </ol>
      </div>
    </aside>
  );
}

function SettingToggle({
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
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-primary/35 bg-primary/5"
          : "border-border/50 bg-muted/15 hover:bg-muted/25",
      )}
      onClick={onClick}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-[11px] text-muted-foreground">{description}</span>
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          active ? "bg-primary" : "bg-muted-foreground/25",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform",
            active ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
