"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";

import {
  DASHBOARD_TABLE_SURFACE,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
import type { PayrollRunRow } from "@/lib/api";
import {
  employmentStatusLabel,
  formatPayrollDate,
  formatPayrollMoney,
} from "@/lib/payroll-utils";

type StatusFilter = "all" | "pending" | "paid" | "attention";

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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !q ||
        row.displayName.toLowerCase().includes(q) ||
        (row.title?.toLowerCase().includes(q) ?? false) ||
        (row.branchName?.toLowerCase().includes(q) ?? false);

      const attention =
        row.employmentStatus === "on_leave" ||
        Number(row.baseSalary) <= 0 ||
        Number(row.advancesOutstanding) > 0;
      const pending =
        !row.alreadyPaid &&
        row.employmentStatus !== "on_leave" &&
        Number(row.baseSalary) > 0;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "paid" && row.alreadyPaid) ||
        (statusFilter === "pending" && pending) ||
        (statusFilter === "attention" && attention && !row.alreadyPaid);

      return matchesQuery && matchesStatus;
    });
  }, [rows, query, statusFilter]);

  const counts = useMemo(() => {
    const pending = rows.filter(
      (r) =>
        !r.alreadyPaid &&
        r.employmentStatus !== "on_leave" &&
        Number(r.baseSalary) > 0,
    ).length;
    const paid = rows.filter((r) => r.alreadyPaid).length;
    const attention = rows.filter(
      (r) =>
        !r.alreadyPaid &&
        (r.employmentStatus === "on_leave" ||
          Number(r.baseSalary) <= 0 ||
          Number(r.advancesOutstanding) > 0),
    ).length;
    return { all: rows.length, pending, paid, attention };
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 px-6 py-16 text-center">
        <p className="text-sm font-medium">No staff in this pay run</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Add staff profiles and set monthly salaries to build your roster for this
          period.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Staff roster</h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {rows.length} shown · click a row for details
          </p>
        </div>
        <label className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            className={dashboardInputClass(false, "pl-9")}
            placeholder="Search by name, role, branch…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["all", "All", counts.all],
            ["pending", "Pending", counts.pending],
            ["attention", "Needs review", counts.attention],
            ["paid", "Paid", counts.paid],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === id
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setStatusFilter(id)}
          >
            {label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                statusFilter === id ? "bg-primary/15" : "bg-muted",
              )}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2 md:hidden">
        {filtered.map((row) => (
          <StaffRunCard
            key={row.userId}
            row={row}
            applyStatutoryPreview={applyStatutoryPreview}
            onSelect={() => onSelectRow(row)}
          />
        ))}
        {filtered.length === 0 ? (
          <EmptyFilter message="No staff match your search or filter." />
        ) : null}
      </div>

      <section className={cn(DASHBOARD_TABLE_SURFACE, "hidden overflow-hidden md:block")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5" colSpan={2}>
                  Employee
                </th>
                <th className="px-4 py-2.5 text-right" colSpan={3}>
                  Compensation & deductions
                </th>
                <th className="px-4 py-2.5 text-right">Net pay</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="w-8" aria-hidden />
              </tr>
              <tr className="border-b border-border/60 bg-muted/20 text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium" colSpan={2} />
                <th className="px-4 py-2 text-right font-medium">Base</th>
                <th className="px-4 py-2 text-right font-medium">Advances</th>
                <th className="px-4 py-2 text-right font-medium">Statutory</th>
                <th className="px-4 py-2" colSpan={3} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12">
                    <EmptyFilter message="No staff match your search or filter." />
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.userId}
                    className="group cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/15"
                    onClick={() => onSelectRow(row)}
                  >
                    <td className="w-12 px-4 py-3">
                      <StaffAvatar name={row.displayName} paid={row.alreadyPaid} />
                    </td>
                    <td className="px-2 py-3">
                      <div className="font-medium">{row.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {[row.title, row.branchName]
                          .filter(Boolean)
                          .join(" · ") || employmentStatusLabel(row.employmentStatus)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.baseSalary > 0 ? (
                        formatPayrollMoney(row.baseSalary)
                      ) : (
                        <span className="text-amber-700 dark:text-amber-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.advancesOutstanding > 0 ? (
                        <span className="font-medium text-amber-800 dark:text-amber-200">
                          −{formatPayrollMoney(row.advancesOutstanding)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {applyStatutoryPreview && row.statutoryTotal > 0
                        ? `−${formatPayrollMoney(row.statutoryTotal)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-base font-semibold">
                      {formatPayrollMoney(row.suggestedNet)}
                    </td>
                    <td className="px-4 py-3">
                      <RunStatusBadge row={row} />
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      <ChevronRight
                        className="size-4 opacity-30 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                        aria-hidden
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StaffAvatar({ name, paid }: { name: string; paid: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className={cn(
        "flex size-9 items-center justify-center rounded-full text-xs font-semibold ring-1",
        paid
          ? "bg-emerald-500/15 text-emerald-800 ring-emerald-500/20 dark:text-emerald-200"
          : "bg-primary/10 text-primary ring-primary/15",
      )}
    >
      {initials || "?"}
    </span>
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
        "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/15",
      )}
      onClick={onSelect}
    >
      <StaffAvatar name={row.displayName} paid={row.alreadyPaid} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium">{row.displayName}</p>
          <RunStatusBadge row={row} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {[row.title, row.branchName].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 text-sm font-semibold tabular-nums">
          Net {formatPayrollMoney(row.suggestedNet)}
          {applyStatutoryPreview && row.statutoryTotal > 0 ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              · stat −{formatPayrollMoney(row.statutoryTotal)}
            </span>
          ) : null}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

function EmptyFilter({ message }: { message: string }) {
  return <p className="text-center text-sm text-muted-foreground">{message}</p>;
}

function RunStatusBadge({ row }: { row: PayrollRunRow }) {
  if (row.alreadyPaid) {
    return (
      <span className="inline-flex flex-col items-end gap-0.5 sm:items-start">
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
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
      <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-medium text-sky-900 dark:text-sky-200">
        On leave
      </span>
    );
  }
  if (row.baseSalary <= 0) {
    return (
      <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-medium text-red-900 dark:text-red-200">
        No salary
      </span>
    );
  }
  if (row.advancesOutstanding > 0) {
    return (
      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-950 dark:text-amber-100">
        Advance due
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      Pending
    </span>
  );
}
