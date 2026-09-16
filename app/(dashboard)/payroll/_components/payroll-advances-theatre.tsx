"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search, Wallet } from "lucide-react";

import {
  DashboardLoadError,
  DashboardLoading,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
import {
  fetchPayrollAdvances,
  type PayrollAdvanceLedgerRow,
} from "@/lib/api";
import {
  exportAdvanceLedgerCsv,
  formatPayrollDate,
  formatPayrollMoney,
} from "@/lib/payroll-utils";
import { cn } from "@/lib/utils";

import { AdvanceLedgerDrawer } from "./advance-ledger-drawer";

type Filter = "all" | "outstanding" | "repaid";

type Props = {
  canReadStaffProfile: boolean;
  canManagePayroll: boolean;
  onOpenStaff?: (userId: string, name: string) => void;
  onLogAdvance?: (userId: string, name: string, outstanding: number) => void;
  onUpdated?: () => void;
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

function statusBadge(row: PayrollAdvanceLedgerRow): {
  label: string;
  className: string;
} {
  if (row.status === "repaid") {
    return {
      label: "Repaid",
      className:
        "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[var(--pos-primary,#0f766e)] text-white",
    };
  }
  if (Number(row.amountRepaid) > 0) {
    return {
      label: "Partial",
      className:
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground",
    };
  }
  return {
    label: "Outstanding",
    className: "border-[#9a2e16]/35 bg-transparent text-[#9a2e16]",
  };
}

export function PayrollAdvancesTheatre({
  canReadStaffProfile,
  canManagePayroll,
  onOpenStaff,
  onLogAdvance,
  onUpdated,
}: Props) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PayrollAdvanceLedgerRow[]>([]);
  const [filter, setFilter] = useState<Filter>("outstanding");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchPayrollAdvances());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load advance ledger",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "outstanding" && row.status === "outstanding") ||
        (filter === "repaid" && row.status === "repaid");
      const matchesQuery =
        !q ||
        row.displayName.toLowerCase().includes(q) ||
        (row.branchName?.toLowerCase().includes(q) ?? false) ||
        (row.note?.toLowerCase().includes(q) ?? false);
      return matchesFilter && matchesQuery;
    });
  }, [rows, filter, query]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const outstandingTotal = useMemo(
    () =>
      rows
        .filter((r) => r.status === "outstanding")
        .reduce((sum, r) => sum + Number(r.balanceOutstanding ?? r.amount), 0),
    [rows],
  );

  const counts = useMemo(
    () => ({
      all: rows.length,
      outstanding: rows.filter((r) => r.status === "outstanding").length,
      repaid: rows.filter((r) => r.status === "repaid").length,
    }),
    [rows],
  );

  function selectRow(row: PayrollAdvanceLedgerRow) {
    setSelectedId(row.id);
    setDrawerOpen(true);
  }

  function clearSelection() {
    setSelectedId(null);
    setDrawerOpen(false);
  }

  if (loading) {
    return <DashboardLoading label="Loading advance ledger…" />;
  }
  if (error) {
    return (
      <DashboardLoadError
        title="Couldn't load advance ledger"
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
              placeholder="Search staff, branch, note…"
              aria-label="Search advances"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["outstanding", "Open", counts.outstanding],
                ["all", "All", counts.all],
                ["repaid", "Repaid", counts.repaid],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-none border px-1.5 text-[10px] font-semibold",
                  filter === id
                    ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                )}
                onClick={() => setFilter(id)}
              >
                {label}
                <span className="tabular-nums opacity-80">{count}</span>
              </button>
            ))}
          </div>
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filtered.length}
            {query.trim() || filter !== "all" ? ` of ${rows.length}` : ""}{" "}
            advances
          </p>
        </div>
        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {filtered.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              No advances in this view.
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filtered.map((row) => {
                const active = selectedId === row.id;
                const badge = statusBadge(row);
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
                          {formatPayrollDate(row.advancedOn)}
                          {row.branchName ? ` · ${row.branchName}` : ""}
                          {" · "}
                          <span className="tabular-nums">
                            {formatPayrollMoney(
                              Number(row.balanceOutstanding ?? row.amount),
                            )}
                          </span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-none border px-1.5 py-0.5 text-[9px] font-semibold",
                          badge.className,
                        )}
                      >
                        {badge.label}
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
    <AdvanceFocus
      row={selected}
      canReadStaffProfile={canReadStaffProfile}
      onOpenStaff={
        onOpenStaff
          ? () => onOpenStaff(selected.userId, selected.displayName)
          : undefined
      }
      className="h-full min-h-0"
    />
  ) : (
    <AdvancesPulse
      outstandingTotal={outstandingTotal}
      counts={counts}
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
          Pick an advance
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          The map in the middle is the ledger. The list on the left names each
          advance.
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
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[12px]">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <LiveDot />
            Advances
          </span>
          <span className={dashboardHintClass()}>
            outstanding {formatPayrollMoney(outstandingTotal)} ·{" "}
            {counts.outstanding} open
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          {filtered.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-1.5 text-[11px]"
              onClick={() => exportAdvanceLedgerCsv(filtered)}
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
            The ledger
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

      <AdvanceLedgerDrawer
        open={drawerOpen && !!selected}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) clearSelection();
        }}
        userId={selected?.userId ?? null}
        staffName={selected?.displayName ?? ""}
        canManage={canManagePayroll}
        docked={isLg}
        dockRoot={dockRoot}
        onUpdated={() => {
          void load();
          onUpdated?.();
        }}
        onLogAdvance={
          canManagePayroll && selected && onLogAdvance
            ? () =>
                onLogAdvance(
                  selected.userId,
                  selected.displayName,
                  Number(selected.balanceOutstanding ?? selected.amount),
                )
            : undefined
        }
      />
    </div>
  );
}

function AdvancesPulse({
  outstandingTotal,
  counts,
  rows,
  onSelect,
  className,
}: {
  outstandingTotal: number;
  counts: { all: number; outstanding: number; repaid: number };
  rows: PayrollAdvanceLedgerRow[];
  onSelect: (row: PayrollAdvanceLedgerRow) => void;
  className?: string;
}) {
  const attention = rows
    .filter((r) => r.status === "outstanding")
    .slice(0, 4);
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

      <article className={cn(card, "left-[8%] top-[20%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Outstanding
        </p>
        <p
          className="mt-2 text-[1.85rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[#9a2e16]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {formatPayrollMoney(outstandingTotal)}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          across {counts.outstanding} open advances
        </p>
      </article>

      <article className={cn(card, "right-[6%] top-[44%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Snapshot
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
          <div>
            <dt className="text-[10px] text-muted-foreground">Open</dt>
            <dd className="font-semibold tabular-nums text-[#9a2e16]">
              {counts.outstanding}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground">Repaid</dt>
            <dd className="font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
              {counts.repaid}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[10px] text-muted-foreground">All entries</dt>
            <dd className="font-semibold tabular-nums">{counts.all}</dd>
          </div>
        </dl>
      </article>

      {attention.length > 0 ? (
        <article
          className={cn(
            card,
            "bottom-[12%] left-[14%] w-[min(19rem,calc(100%-1.5rem))]",
          )}
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Wallet className="size-3" aria-hidden />
            Needs recovery
          </p>
          <ul className="mt-2 space-y-1.5">
            {attention.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left text-[12px] hover:text-[var(--pos-primary,#0f766e)]"
                  onClick={() => onSelect(row)}
                >
                  <span className="truncate font-medium">{row.displayName}</span>
                  <span className="shrink-0 tabular-nums text-[#9a2e16]">
                    {formatPayrollMoney(
                      Number(row.balanceOutstanding ?? row.amount),
                    )}
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

function AdvanceFocus({
  row,
  canReadStaffProfile,
  onOpenStaff,
  className,
}: {
  row: PayrollAdvanceLedgerRow;
  canReadStaffProfile?: boolean;
  onOpenStaff?: () => void;
  className?: string;
}) {
  const badge = statusBadge(row);
  const card =
    "absolute z-[1] w-[min(18rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-4 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <article className={cn(card, "left-1/2 top-[28%] -translate-x-1/2")}>
        <div className="flex items-start gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center border text-[12px] font-bold uppercase"
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
              {formatPayrollDate(row.advancedOn)}
              {row.branchName ? ` · ${row.branchName}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-4 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Balance
          </p>
          <p
            className="mt-1.5 text-[1.75rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[#9a2e16]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {formatPayrollMoney(Number(row.balanceOutstanding ?? row.amount))}
          </p>
          <p className={cn(dashboardHintClass(), "mt-2")}>
            of {formatPayrollMoney(Number(row.amount))} · repaid{" "}
            {formatPayrollMoney(Number(row.amountRepaid ?? 0))}
          </p>
        </div>
        <span
          className={cn(
            "mt-3 inline-flex rounded-none border px-1.5 py-0.5 text-[10px] font-semibold",
            badge.className,
          )}
        >
          {badge.label}
        </span>
        {canReadStaffProfile && onOpenStaff ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-4 h-8 w-full rounded-none shadow-none"
            onClick={onOpenStaff}
          >
            Open staff profile
          </Button>
        ) : null}
      </article>
    </div>
  );
}
