"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Receipt,
  Search,
} from "lucide-react";

import {
  DashboardLoadError,
  DashboardLoading,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
import {
  fetchPayrollPeriodPayslips,
  type PayslipRecord,
} from "@/lib/api";
import {
  defaultPayrollPeriod,
  exportPayslipHistoryCsv,
  formatPayrollDateTime,
  formatPayrollMoney,
  isPayrollFocusPeriod,
  payrollMonthLabel,
  shiftPayrollMonth,
} from "@/lib/payroll-utils";
import { cn } from "@/lib/utils";

import { PayslipDrawer } from "./payslip-drawer";

type Props = {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  reloadToken?: number;
};

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PayrollPayslipsTheatre({
  year,
  month,
  onMonthChange,
  reloadToken,
}: Props) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PayslipRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchPayrollPeriodPayslips(year, month));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payslips");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  useEffect(() => {
    setSelectedId(null);
    setDrawerOpen(false);
  }, [year, month]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.displayName.toLowerCase().includes(q) ||
        (row.note?.toLowerCase().includes(q) ?? false) ||
        (row.payslipNumber?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, query]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          base: acc.base + Number(row.baseSalary),
          advances: acc.advances + Number(row.advancesDeducted),
          other: acc.other + Number(row.otherDeductions),
          net: acc.net + Number(row.netPaid),
        }),
        { base: 0, advances: 0, other: 0, net: 0 },
      ),
    [rows],
  );

  function selectRow(row: PayslipRecord) {
    setSelectedId(row.id);
    setDrawerOpen(true);
  }

  function clearSelection() {
    setSelectedId(null);
    setDrawerOpen(false);
  }

  const focus = defaultPayrollPeriod();
  const isFocusPeriod = isPayrollFocusPeriod(year, month);

  if (loading) {
    return <DashboardLoading label="Loading payslip history…" />;
  }
  if (error) {
    return (
      <DashboardLoadError
        title="Couldn't load payslips"
        message={error}
        onRetry={() => void load()}
      />
    );
  }

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;
    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(
                dashboardInputClass(),
                "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, note, number…"
              aria-label="Search payslips"
            />
          </label>
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filtered.length}
            {query.trim() ? ` of ${rows.length}` : ""} payslip
            {filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {rows.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <Receipt
                className="mx-auto size-7 text-muted-foreground/60"
                aria-hidden
              />
              <p className="mt-2 text-[14px] font-semibold">No payslips yet</p>
              <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem]")}>
                Payslips appear here after you mark staff paid for{" "}
                {payrollMonthLabel(year, month)}.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              No payslips match “{query.trim()}”.
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filtered.map((row) => {
                const active = selectedId === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => selectRow(row)}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center border text-[10px] font-bold uppercase",
                          active
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {staffInitials(row.displayName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em]",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {row.displayName}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {formatPayrollDateTime(row.paidAt)}
                          {" · "}
                          <span className="tabular-nums">
                            {formatPayrollMoney(Number(row.netPaid))}
                          </span>
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[var(--pos-primary,#0f766e)] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        Paid
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const room = selected ? (
    <PayslipFocus row={selected} className="h-full min-h-0" />
  ) : (
    <PayslipsPulse
      year={year}
      month={month}
      totals={totals}
      count={rows.length}
      rows={rows}
      onSelect={selectRow}
      className="h-full min-h-0"
    />
  );

  const inspectEmpty = (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a payslip
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          The map in the middle is this period. The list on the left names who
          was paid.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
          "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Previous month"
              onClick={() => {
                const next = shiftPayrollMonth(year, month, -1);
                onMonthChange(next.year, next.month);
              }}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </Button>
            <p className="flex items-center gap-1.5 text-[12px]">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <LiveDot />
                {payrollMonthLabel(year, month)}
              </span>
              <span className={dashboardHintClass()}>
                {rows.length} payslip{rows.length === 1 ? "" : "s"}
                {rows.length > 0
                  ? ` · net ${formatPayrollMoney(totals.net)}`
                  : ""}
              </span>
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Next month"
              onClick={() => {
                const next = shiftPayrollMonth(year, month, 1);
                onMonthChange(next.year, next.month);
              }}
            >
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {!isFocusPeriod ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-[11px]"
              onClick={() => onMonthChange(focus.year, focus.month)}
            >
              {focus.month !== new Date().getMonth() + 1 ||
              focus.year !== new Date().getFullYear()
                ? `Focus · ${payrollMonthLabel(focus.year, focus.month)}`
                : "This month"}
            </Button>
          ) : null}
          {rows.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-1.5 text-[11px]"
              onClick={() => exportPayslipHistoryCsv(rows, year, month)}
            >
              <Download className="size-3.5" aria-hidden />
              Export
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-1.5 text-[11px]"
            onClick={() => void load()}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] lg:grid",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
          {roster({ fill: true, denser: true })}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <p
            className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
            aria-hidden
          >
            The period
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && selected ? null : inspectEmpty}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <PayslipDrawer
        open={drawerOpen && !!selected}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) clearSelection();
        }}
        userId={selected?.userId ?? null}
        staffName={selected?.displayName ?? ""}
        year={selected?.periodYear ?? year}
        month={selected?.periodMonth ?? month}
        payslipId={selected?.id ?? null}
        initialPayslip={selected}
        docked={isLg}
        dockRoot={dockRoot}
      />
    </div>
  );
}

function PayslipsPulse({
  year,
  month,
  totals,
  count,
  rows,
  onSelect,
  className,
}: {
  year: number;
  month: number;
  totals: { base: number; advances: number; other: number; net: number };
  count: number;
  rows: PayslipRecord[];
  onSelect: (row: PayslipRecord) => void;
  className?: string;
}) {
  const recent = rows.slice(0, 4);
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M22 42 C 38 28, 58 22, 72 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M28 48 C 48 58, 62 52, 74 62"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <article className={cn(card, "left-[8%] top-[18%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Net paid
        </p>
        <p
          className="mt-2 text-[1.85rem] font-semibold leading-none tracking-[-0.04em] tabular-nums"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {formatPayrollMoney(totals.net)}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {count} payslip{count === 1 ? "" : "s"} ·{" "}
          {payrollMonthLabel(year, month)}
        </p>
      </article>

      <article className={cn(card, "right-[6%] top-[42%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Snapshot
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
          <div>
            <dt className="text-[10px] text-muted-foreground">Gross</dt>
            <dd className="font-semibold tabular-nums">
              {formatPayrollMoney(totals.base)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground">Advances</dt>
            <dd
              className={cn(
                "font-semibold tabular-nums",
                totals.advances > 0 && "text-[#9a2e16]",
              )}
            >
              {formatPayrollMoney(totals.advances)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[10px] text-muted-foreground">Other deductions</dt>
            <dd className="font-semibold tabular-nums">
              {formatPayrollMoney(totals.other)}
            </dd>
          </div>
        </dl>
      </article>

      {recent.length > 0 ? (
        <article
          className={cn(
            card,
            "bottom-[12%] left-[14%] w-[min(19rem,calc(100%-1.5rem))]",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Recent
          </p>
          <ul className="mt-2 space-y-1.5">
            {recent.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left text-[12px] hover:text-[var(--pos-primary,#0f766e)]"
                  onClick={() => onSelect(row)}
                >
                  <span className="truncate font-medium">{row.displayName}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatPayrollMoney(Number(row.netPaid))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}

function PayslipFocus({
  row,
  className,
}: {
  row: PayslipRecord;
  className?: string;
}) {
  const card =
    "absolute z-[1] w-[min(18rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-4 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <article className={cn(card, "left-1/2 top-[28%] -translate-x-1/2")}>
        <div className="flex items-start gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center border border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[12px] font-bold uppercase text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          >
            {staffInitials(row.displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[1.15rem] font-semibold leading-none tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {row.displayName}
            </p>
            <p className={cn(dashboardHintClass(), "mt-1.5")}>
              {formatPayrollDateTime(row.paidAt)}
            </p>
          </div>
        </div>
        <div className="mt-4 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Net paid
          </p>
          <p
            className="mt-1.5 text-[1.75rem] font-semibold leading-none tracking-[-0.04em] tabular-nums"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {formatPayrollMoney(Number(row.netPaid))}
          </p>
          <p className={cn(dashboardHintClass(), "mt-2")}>
            Base {formatPayrollMoney(Number(row.baseSalary))}
            {Number(row.advancesDeducted) > 0
              ? ` · advances −${formatPayrollMoney(Number(row.advancesDeducted))}`
              : ""}
          </p>
        </div>
      </article>
    </div>
  );
}
