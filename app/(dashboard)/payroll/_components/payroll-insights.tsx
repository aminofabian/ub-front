"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Info,
  Minus,
  ReceiptText,
  Scale,
  Wallet,
} from "lucide-react";

import { dashboardHintClass } from "@/components/dashboard-page-ui";
import type {
  PayrollRunRow,
  PayrollSummary,
  PayrollSummaryIssue,
} from "@/lib/api";
import {
  formatPayrollDate,
  formatPayrollMoney,
  payrollMonthLabel,
} from "@/lib/payroll-utils";
import { cn } from "@/lib/utils";

type Props = {
  summary: PayrollSummary | null;
  /** Summary request in flight — keep the previous numbers visible but dimmed. */
  loading?: boolean;
  /** Whether this run will post salary expenses to Finance. */
  postExpense?: boolean;
  rows: PayrollRunRow[];
  onSelectRow: (row: PayrollRunRow) => void;
};

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

function Tile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warning" | "muted" | "good";
}) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-[1.05rem] font-semibold leading-none tracking-[-0.03em] tabular-nums",
          tone === "warning" && "text-[#9a2e16]",
          tone === "muted" && "text-muted-foreground",
          tone === "good" && "text-[var(--pos-primary,#0f766e)]",
        )}
        style={{ fontFamily: "var(--font-heading)" }}
        title={value}
      >
        {value}
      </p>
      <p className={cn(dashboardHintClass(), "mt-1 truncate")} title={hint}>
        {hint}
      </p>
    </div>
  );
}

function IssueIcon({ issue }: { issue: PayrollSummaryIssue }) {
  if (issue.severity === "blocker") {
    return <AlertTriangle className="size-3.5 shrink-0 text-[#9a2e16]" aria-hidden />;
  }
  if (issue.severity === "warning") {
    return <AlertTriangle className="size-3.5 shrink-0 text-[#a16207]" aria-hidden />;
  }
  return <Info className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />;
}

function issueTone(issue: PayrollSummaryIssue): string {
  if (issue.severity === "blocker") {
    return "border-[#9a2e16]/30 bg-[color-mix(in_srgb,#9a2e16_4%,white)]";
  }
  if (issue.severity === "warning") {
    return "border-[#a16207]/30 bg-[color-mix(in_srgb,#a16207_4%,white)]";
  }
  return "border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)]";
}

export function PayrollInsights({
  summary,
  loading = false,
  postExpense = true,
  rows,
  onSelectRow,
}: Props) {
  if (!summary) return null;

  const pendingIssues = summary.issues.filter(
    (issue) => issue.code !== "not_released",
  );
  const blockers = pendingIssues.filter((issue) => issue.severity === "blocker");
  const warned = pendingIssues.filter((issue) => issue.severity === "warning");
  const ready = blockers.length === 0 && warned.length === 0;
  const delta = summary.previous.grossDeltaPct;
  const headcountDelta = summary.headcount - summary.previous.headcount;

  function focusFirstStaff(issue: PayrollSummaryIssue) {
    for (const ref of issue.staff) {
      const row = rows.find((candidate) => candidate.userId === ref.userId);
      if (row) {
        onSelectRow(row);
        return;
      }
    }
  }

  return (
    <section
      className={cn(
        "overflow-hidden border bg-white transition-opacity",
        HAIRLINE,
        loading && "opacity-60",
      )}
      aria-label="Payroll overview"
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-1.5",
          HAIRLINE,
        )}
      >
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[-0.01em] text-foreground">
          <CircleDollarSign
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Run overview
          <span className="font-normal text-muted-foreground">
            · {payrollMonthLabel(summary.year, summary.month)}
          </span>
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold",
            summary.salaryReleased
              ? "border-[var(--pos-primary,#0f766e)]/35 bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] text-[var(--pos-primary,#0f766e)]"
              : "border-[#a16207]/35 bg-[color-mix(in_srgb,#a16207_5%,white)] text-[#a16207]",
          )}
        >
          {summary.salaryReleased ? "Pay day open" : `Pay day ${formatPayrollDate(summary.unlockDate)}`}
        </span>
        <p className={cn(dashboardHintClass(), "ml-auto tabular-nums")}>
          {summary.paidCount}/{summary.headcount} paid ·{" "}
          {summary.headcount > 0
            ? Math.round((summary.paidCount / summary.headcount) * 100)
            : 0}
          % closed
        </p>
      </div>

      <div
        className={cn(
          "grid grid-cols-2 divide-x divide-y border-b sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0",
          HAIRLINE,
        )}
      >
        <Tile
          label="Cash to pay"
          value={formatPayrollMoney(summary.netPayable)}
          hint={`${summary.pendingCount} pending${summary.paidCount > 0 ? ` · ${summary.paidCount} already paid` : ""}`}
          tone={summary.netPayable > 0 ? "default" : "good"}
        />
        <Tile
          label="Gross cost"
          value={formatPayrollMoney(summary.gross)}
          hint={
            summary.arrearsGross > 0
              ? `${summary.headcount} staff · incl. ${formatPayrollMoney(summary.arrearsGross)} arrears`
              : `${summary.headcount} staff on the run`
          }
        />
        <Tile
          label="Statutory withheld"
          value={
            summary.statutory > 0 ? formatPayrollMoney(summary.statutory) : "Off"
          }
          hint={
            summary.statutory > 0
              ? "PAYE · NSSF · SHIF · Housing Levy"
              : "Nothing withheld — enable statutory to calculate"
          }
          tone={summary.statutory > 0 ? "default" : "muted"}
        />
        <Tile
          label="Advances recovered"
          value={formatPayrollMoney(summary.advancesScheduled)}
          hint={
            summary.advancesScheduled > 0
              ? "Scheduled from this month's pay"
              : "No scheduled repayment this run"
          }
          tone={summary.advancesScheduled > 0 ? "warning" : "muted"}
        />
        <Tile
          label="Already paid"
          value={formatPayrollMoney(summary.paidNet)}
          hint={`${summary.paidCount} of ${summary.headcount} payslips recorded`}
          tone={summary.paidCount > 0 ? "good" : "muted"}
        />
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className={cn("px-3 py-2.5 lg:border-r", HAIRLINE)}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Before you pay
            </p>
            {ready ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--pos-primary,#0f766e)]">
                <CheckCircle2 className="size-3.5" aria-hidden />
                Ready
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-[#9a2e16]">
                {blockers.length} blocker{blockers.length === 1 ? "" : "s"} ·{" "}
                {warned.length} warning{warned.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {pendingIssues.length === 0 ? (
            <p className={cn(dashboardHintClass(), "mt-2")}>
              Every person has a salary and a way to be paid. Close the run.
            </p>
          ) : (
            <ul className="mt-1.5 flex flex-wrap gap-1">
              {pendingIssues.map((issue) => (
                <li key={issue.code}>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex max-w-full items-center gap-1 border px-1.5 py-1 text-left text-[10px] font-medium transition-colors hover:border-[var(--pos-primary,#0f766e)]",
                      issueTone(issue),
                    )}
                    onClick={() => focusFirstStaff(issue)}
                    title={issue.detail}
                  >
                    <IssueIcon issue={issue} />
                    <span className="truncate">
                      {issue.label} ({issue.count})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pendingIssues.length > 0 ? (
            <p className={cn(dashboardHintClass(), "mt-1.5 line-clamp-2")}>
              {pendingIssues[0]?.detail}
            </p>
          ) : null}
        </div>

        <div className={cn("px-3 py-2.5 lg:border-r", HAIRLINE)}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Finance
          </p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <Wallet className="size-3.5 shrink-0 text-[var(--pos-primary,#0f766e)]" aria-hidden />
            <p className="text-[13px] font-semibold tabular-nums">
              {formatPayrollMoney(summary.finance.postedAmount)}
            </p>
            <span className={dashboardHintClass()}>posted</span>
          </div>
          <p className={cn(dashboardHintClass(), "mt-1")}>
            {summary.finance.postedCount + summary.finance.unpostedCount === 0
              ? postExpense
                ? "No payslips yet. Salary expense posts when you mark paid."
                : "Finance posting is off for this run. Turn it on before paying to record the cost."
              : summary.finance.unpostedCount > 0
                ? `${summary.finance.unpostedCount} paid payslip${summary.finance.unpostedCount === 1 ? "" : "s"} (${formatPayrollMoney(summary.finance.unpostedNet)}) missing from expenses${postExpense ? "" : " — posting was off"}.`
                : "Every payslip this period is in the books."}
          </p>
          <Link
            href="/expenses"
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--pos-primary,#0f766e)] hover:underline"
          >
            <ReceiptText className="size-3" aria-hidden />
            Open expenses
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        </div>

        <div className="px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            vs {payrollMonthLabel(summary.previous.year, summary.previous.month)}
          </p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            {delta == null ? (
              <Minus className="size-3.5 text-muted-foreground" aria-hidden />
            ) : delta > 0 ? (
              <ArrowUpRight className="size-3.5 text-[#9a2e16]" aria-hidden />
            ) : delta < 0 ? (
              <ArrowDownRight
                className="size-3.5 text-[var(--pos-primary,#0f766e)]"
                aria-hidden
              />
            ) : (
              <Minus className="size-3.5 text-muted-foreground" aria-hidden />
            )}
            <p
              className={cn(
                "text-[13px] font-semibold tabular-nums",
                delta != null && delta > 0
                  ? "text-[#9a2e16]"
                  : delta != null && delta < 0
                    ? "text-[var(--pos-primary,#0f766e)]"
                    : "",
              )}
            >
              {delta == null
                ? "First run"
                : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
            </p>
            <span className={dashboardHintClass()}>gross</span>
          </div>
          <p className={cn(dashboardHintClass(), "mt-1 tabular-nums")}>
            {formatPayrollMoney(summary.previous.gross)} last month ·{" "}
            {headcountDelta === 0
              ? "same headcount"
              : `${headcountDelta > 0 ? "+" : ""}${headcountDelta} staff`}
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Scale className="size-3" aria-hidden />
            {summary.branches.length > 1
              ? `${summary.branches.length} branches on this run`
              : "Single-branch run"}
          </span>
        </div>
      </div>

      {summary.branches.length > 1 ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-1.5",
            HAIRLINE,
          )}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Branches
          </span>
          {summary.branches.map((branch) => (
            <span
              key={branch.branchId ?? branch.branchName}
              className="inline-flex items-baseline gap-1 text-[10px] text-muted-foreground"
            >
              <span className="font-medium text-foreground">
                {branch.branchName}
              </span>
              <span className="tabular-nums">
                {formatPayrollMoney(branch.netPayable)}
              </span>
              <span>
                · {branch.pendingCount} pending
                {branch.paidCount > 0 ? ` · ${branch.paidCount} paid` : ""}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
