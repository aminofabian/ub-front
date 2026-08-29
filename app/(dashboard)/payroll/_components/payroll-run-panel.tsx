"use client";

import { ChevronRight, Users } from "lucide-react";

import { DASHBOARD_TABLE_SURFACE } from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
import type { PayrollRunRow } from "@/lib/api";
import {
  employmentStatusLabel,
  formatPayrollDate,
  formatPayrollMoney,
} from "@/lib/payroll-utils";

type Props = {
  rows: PayrollRunRow[];
  applyStatutoryPreview: boolean;
  onSelectRow: (row: PayrollRunRow) => void;
};

export function PayrollRunPanel({
  rows,
  applyStatutoryPreview,
  onSelectRow,
}: Props) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-border/50 px-4 py-12 text-center text-sm text-muted-foreground">
        No staff in this payroll run.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <StaffRunCard
            key={row.userId}
            row={row}
            applyStatutoryPreview={applyStatutoryPreview}
            onSelect={() => onSelectRow(row)}
          />
        ))}
      </div>

      <section className={cn(DASHBOARD_TABLE_SURFACE, "hidden md:block")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium" colSpan={2}>
                  Employee
                </th>
                <th className="px-4 py-3 font-medium text-right">Base</th>
                <th className="px-4 py-3 font-medium text-right">Advances</th>
                <th className="px-4 py-3 font-medium text-right">Statutory</th>
                <th className="px-4 py-3 font-medium text-right">Net</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="w-10 px-2 py-3" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.userId}
                  className="group cursor-pointer border-b border-border/40 last:border-0 hover:bg-muted/20"
                  onClick={() => onSelectRow(row)}
                >
                  <td className="px-4 py-3" colSpan={2}>
                    <div className="font-medium">{row.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {[row.title, row.branchName, employmentStatusLabel(row.employmentStatus)]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.baseSalary > 0 ? (
                      formatPayrollMoney(row.baseSalary)
                    ) : (
                      <span className="text-amber-700 dark:text-amber-300">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.advancesOutstanding > 0 ? (
                      <span className="font-medium text-amber-800 dark:text-amber-200">
                        {formatPayrollMoney(row.advancesOutstanding)}
                      </span>
                    ) : (
                      formatPayrollMoney(0)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {applyStatutoryPreview && row.statutoryTotal > 0
                      ? formatPayrollMoney(row.statutoryTotal)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    {formatPayrollMoney(row.suggestedNet)}
                  </td>
                  <td className="px-4 py-3">
                    <RunStatusBadge row={row} />
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    <ChevronRight
                      className="size-4 opacity-40 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function StaffRunCard({
  row,
  applyStatutoryPreview,
  onSelect,
}: {
  row: PayrollRunRow;
  applyStatutoryPreview: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        DASHBOARD_TABLE_SURFACE,
        "w-full space-y-3 p-4 text-left transition-colors hover:bg-muted/20",
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{row.displayName}</p>
          <p className="text-xs text-muted-foreground">
            {[row.title, row.branchName].filter(Boolean).join(" · ")}
          </p>
        </div>
        <RunStatusBadge row={row} />
      </div>
      <dl className="grid grid-cols-4 gap-2 text-center text-xs">
        <MetricCell label="Base" value={formatPayrollMoney(row.baseSalary)} warn={row.baseSalary <= 0} />
        <MetricCell
          label="Advances"
          value={formatPayrollMoney(row.advancesOutstanding)}
          warn={row.advancesOutstanding > 0}
        />
        <MetricCell
          label="Statutory"
          value={
            applyStatutoryPreview && row.statutoryTotal > 0
              ? formatPayrollMoney(row.statutoryTotal)
              : "—"
          }
        />
        <MetricCell label="Net" value={formatPayrollMoney(row.suggestedNet)} strong />
      </dl>
    </button>
  );
}

function MetricCell({
  label,
  value,
  warn,
  strong,
}: {
  label: string;
  value: string;
  warn?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-2 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 tabular-nums",
          strong && "font-semibold",
          warn && "text-amber-800 dark:text-amber-200",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function RunStatusBadge({ row }: { row: PayrollRunRow }) {
  if (row.alreadyPaid) {
    return (
      <span className="inline-flex flex-col items-start gap-0.5">
        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-800 dark:text-emerald-300">
          Paid
        </span>
        {row.paidAt ? (
          <span className="text-[10px] text-muted-foreground">
            {formatPayrollDate(row.paidAt)}
          </span>
        ) : null}
      </span>
    );
  }
  if (row.employmentStatus === "on_leave") {
    return (
      <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs text-sky-900 dark:text-sky-200">
        On leave
      </span>
    );
  }
  if (row.baseSalary <= 0) {
    return (
      <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-xs text-red-900 dark:text-red-200">
        No salary
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs text-amber-950 dark:text-amber-100">
      <Users className="size-3" aria-hidden />
      Pending
    </span>
  );
}
