"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Loader2,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";

import { AdjustItemCostPanel } from "@/components/inventory/adjust-item-cost-panel";
import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
import type {
  BranchRecord,
  CostIssueRowRecord,
  CostIssuesResponseRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export type IssueFilter =
  | "all"
  | "zero_cost"
  | "sells_at_loss"
  | "thin_margin"
  | "high_margin";

export const ISSUE_META: Record<
  Exclude<IssueFilter, "all">,
  { label: string; className: string }
> = {
  zero_cost: {
    label: "No cost",
    className:
      "border-rose-600/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  sells_at_loss: {
    label: "Sells at loss",
    className:
      "border-rose-600/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  thin_margin: {
    label: "Thin margin",
    className:
      "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  high_margin: {
    label: "High margin",
    className: "border-sky-600/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  },
};

function toNum(n: number | string | null | undefined): number | null {
  if (n == null || n === "") return null;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : null;
}

function fmtMoney(n: number | null, currency: string): string {
  if (n == null) return "—";
  try {
    return n.toLocaleString(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return n.toFixed(2);
  }
}

function fmtQty(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function itemInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function issueBadgeClass(issue: CostIssueRowRecord["primaryIssue"]): string {
  return ISSUE_META[issue].className;
}

export type CostIssuesTheatreProps = {
  loading: boolean;
  message: string;
  data: CostIssuesResponseRecord | null;
  rows: CostIssueRowRecord[];
  currency: string;
  canAdjust: boolean;
  branches: BranchRecord[];
  branchFilter: string;
  isBranchLockedRole: boolean;
  meBranchId?: string | null;
  onChangeBranch: (id: string) => void;
  onRefresh: () => void;
  issueFilter: IssueFilter;
  onIssueFilterChange: (value: IssueFilter) => void;
  counts: { key: IssueFilter; label: string; value: number }[];
  inStockOnly: boolean;
  onInStockOnlyChange: (value: boolean) => void;
  activeBranchName: string;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  selectedRow: CostIssueRowRecord | null;
  onSelect: (row: CostIssueRowRecord) => void;
  onClearSelection: () => void;
  mobileShowDetail: boolean;
  onSaved: (updated: CostIssueRowRecord) => void;
  alerts?: ReactNode;
};

function CostIssuesContextBanner({
  data,
  loading,
  activeBranchName,
  rowsShown,
}: {
  data: CostIssuesResponseRecord | null;
  loading: boolean;
  activeBranchName: string;
  rowsShown: number;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <LiveDot />
          {loading
            ? "Loading cost issues…"
            : data
              ? `${data.total.toLocaleString()} flagged`
              : "Cost issues"}
        </span>
        {data && !loading ? (
          <>
            <span className={dashboardHintClass()}>{activeBranchName}</span>
            <span className={dashboardHintClass()}>
              {rowsShown.toLocaleString()} shown
              {rowsShown !== data.total
                ? ` · ${data.total.toLocaleString()} total`
                : ""}
            </span>
            <span className={dashboardHintClass()}>
              {data.zeroCostCount} no cost · {data.sellsAtLossCount} at loss
            </span>
          </>
        ) : (
          <span className={dashboardHintClass()}>
            Pick filters and refresh to load flagged items.
          </span>
        )}
      </p>
      <span className={cn(dashboardHintClass(), "hidden sm:inline")}>
        Fix costs to correct future profit — past sales stay unchanged.
      </span>
    </div>
  );
}

function CostIssuesPulse({
  data,
  rows,
  onSelect,
  className,
}: {
  data: CostIssuesResponseRecord;
  rows: CostIssueRowRecord[];
  onSelect: (row: CostIssueRowRecord) => void;
  className?: string;
}) {
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  const urgent = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.primaryIssue === "zero_cost" || r.primaryIssue === "sells_at_loss",
      ).slice(0, 5),
    [rows],
  );

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M18 38 C 36 24, 58 20, 76 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M24 52 C 44 62, 64 56, 78 68"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <article className={cn(card, "left-[8%] top-[16%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Flagged items
        </p>
        <p
          className="mt-2 text-[2.15rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {data.total.toLocaleString()}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Missing cost, loss, thin, or high margin
        </p>
      </article>

      <article className={cn(card, "right-[6%] top-[34%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          No cost / at loss
        </p>
        <p
          className={cn(
            "mt-2 text-[1.85rem] font-semibold leading-none tracking-[-0.04em] tabular-nums",
            data.zeroCostCount + data.sellsAtLossCount > 0
              ? "text-[#9a2e16]"
              : "text-[var(--pos-primary,#0f766e)]",
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {(data.zeroCostCount + data.sellsAtLossCount).toLocaleString()}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {data.zeroCostCount} zero · {data.sellsAtLossCount} below sell
        </p>
      </article>

      <article className={cn(card, "left-[10%] bottom-[10%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Margin bands
        </p>
        <p
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {data.thinMarginCount} thin · {data.highMarginCount} high
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Thresholds from workspace pricing rules
        </p>
      </article>

      {urgent.length > 0 ? (
        <article className={cn(card, "right-[4%] bottom-[8%]")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Needs attention
          </p>
          <ul className="mt-2 space-y-1.5">
            {urgent.map((r) => (
              <li key={r.itemId}>
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  className="text-left text-[12px] font-semibold tracking-[-0.015em] text-foreground underline-offset-2 hover:underline"
                >
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}

function CostIssuesFocus({
  row,
  currency,
  className,
}: {
  row: CostIssueRowRecord;
  currency: string;
  className?: string;
}) {
  const cost = toNum(row.effectiveCost);
  const sell = toNum(row.sellPrice);
  const margin = toNum(row.marginPct);
  const meta = ISSUE_META[row.primaryIssue];

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-6",
        className,
      )}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <circle
          cx="50"
          cy="46"
          r="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          strokeDasharray="1.2 1.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="relative z-[1] flex max-w-md flex-col items-center text-center">
        <span
          className="grid size-16 place-items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white text-[1.1rem] font-bold tracking-wide text-foreground shadow-[0_10px_28px_color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
          aria-hidden
        >
          {itemInitials(row.name)}
        </span>
        <h3
          className="mt-4 text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {row.name}
        </h3>
        <p className="mt-2 text-[12px] text-muted-foreground">{row.sku}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-none border px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
              issueBadgeClass(row.primaryIssue),
            )}
          >
            {meta.label}
          </span>
          {row.costSource === "reference" ? (
            <span className="inline-flex items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
              Reference cost
            </span>
          ) : null}
        </div>
        <dl className="mt-6 grid w-full grid-cols-3 gap-2 text-left">
          <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white/80 px-2.5 py-2">
            <dt className={dashboardHintClass()}>Cost</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
              {cost == null || cost <= 0 ? (
                <span className="text-rose-600">—</span>
              ) : (
                fmtMoney(cost, currency)
              )}
            </dd>
          </div>
          <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white/80 px-2.5 py-2">
            <dt className={dashboardHintClass()}>Sell</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
              {fmtMoney(sell, currency)}
            </dd>
          </div>
          <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white/80 px-2.5 py-2">
            <dt className={dashboardHintClass()}>Margin</dt>
            <dd
              className={cn(
                "mt-0.5 font-mono text-sm font-semibold tabular-nums",
                margin != null && margin < 0
                  ? "text-rose-600"
                  : margin != null && margin < 5
                    ? "text-amber-600"
                    : margin != null && margin > 50
                      ? "text-sky-700 dark:text-sky-300"
                      : "",
              )}
            >
              {margin == null ? "—" : `${margin.toFixed(1)}%`}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function CostIssuesTheatre(props: CostIssuesTheatreProps) {
  const {
    loading,
    message,
    data,
    rows,
    currency,
    canAdjust,
    branches,
    branchFilter,
    isBranchLockedRole,
    meBranchId,
    onChangeBranch,
    onRefresh,
    issueFilter,
    onIssueFilterChange,
    counts,
    inStockOnly,
    onInStockOnlyChange,
    activeBranchName,
    search,
    onSearchChange,
    selectedId,
    selectedRow,
    onSelect,
    onClearSelection,
    mobileShowDetail,
    onSaved,
    alerts,
  } = props;

  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const mobileDetailOpen = mobileShowDetail && !!selectedRow;

  const refreshDisabled =
    loading || (isBranchLockedRole && !meBranchId?.trim());

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
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Name or SKU…"
              aria-label="Search flagged items"
            />
          </label>

          {counts.length > 0 ? (
            <div
              className="flex flex-wrap gap-0.5 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-0.5"
              role="group"
              aria-label="Issue type filter"
            >
              {counts.map((c) => {
                const active = issueFilter === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onIssueFilterChange(c.key)}
                    className={cn(
                      "inline-flex h-7 flex-1 items-center justify-center gap-1 px-1.5 text-[10px] font-semibold transition-colors sm:flex-none sm:px-2",
                      active
                        ? "bg-[var(--pos-primary,#0f766e)] text-white"
                        : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground",
                    )}
                  >
                    <span className="truncate">{c.label}</span>
                    <span className="font-mono tabular-nums">
                      {c.value.toLocaleString("en-KE")}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-0.5 text-[11px] sm:col-span-2">
              <span className={dashboardHintClass()}>Branch</span>
              <select
                className={cn(
                  dashboardSelectClass(isBranchLockedRole),
                  "h-8 py-0 text-[11px]",
                )}
                value={branchFilter}
                disabled={isBranchLockedRole}
                onChange={(e) => onChangeBranch(e.target.value)}
                aria-label="Branch filter"
              >
                {isBranchLockedRole ? null : (
                  <option value="">All branches</option>
                )}
                {branches
                  .filter((b) => b.active)
                  .filter((b) => !isBranchLockedRole || b.id === meBranchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex h-8 items-center gap-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2.5 text-[11px] font-medium text-muted-foreground sm:col-span-2">
              <input
                type="checkbox"
                className="size-3.5 rounded-none border-input accent-[var(--pos-primary,#0f766e)]"
                checked={inStockOnly}
                onChange={(e) => onInStockOnlyChange(e.target.checked)}
              />
              In stock only
            </label>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className={cn(dashboardHintClass(), "tabular-nums")}>
              {rows.length}{" "}
              {rows.length === 1 ? "item" : "items"}
              {search.trim() ? " matching search" : ""}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1 rounded-none px-2 text-[11px]"
              disabled={refreshDisabled}
              onClick={onRefresh}
            >
              {loading ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3" aria-hidden />
              )}
              Refresh
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {loading ? (
            <p
              className={cn(
                dashboardHintClass(),
                "flex items-center justify-center gap-2 px-3 py-10",
              )}
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading…
            </p>
          ) : !data ? (
            <p className={cn(dashboardHintClass(), "px-3 py-10 text-center")}>
              Refresh to load cost issues.
            </p>
          ) : rows.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <Package
                className="mx-auto size-7 text-muted-foreground/60"
                aria-hidden
              />
              <p className="mt-2 text-[14px] font-semibold text-foreground">
                {data.total === 0
                  ? "No cost issues"
                  : "No items match filters"}
              </p>
              <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem]")}>
                {data.total === 0
                  ? "Every stocked item has a sensible cost."
                  : "Try another issue type or clear search."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {rows.map((row) => {
                const active = selectedId === row.itemId;
                const meta = ISSUE_META[row.primaryIssue];
                const margin = toNum(row.marginPct);
                return (
                  <li key={row.itemId}>
                    <button
                      type="button"
                      onClick={() => onSelect(row)}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center border text-[10px] font-bold uppercase tracking-wide",
                          active
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {itemInitials(row.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {row.name}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {row.sku} · {fmtQty(toNum(row.activeQty))} in stock
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 flex-col items-end gap-0.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-none border px-1.5 py-0.5 text-[9px] font-semibold tracking-[-0.02em]",
                            meta.className,
                          )}
                        >
                          {meta.label}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[10px] tabular-nums",
                            margin != null && margin < 0
                              ? "text-rose-600"
                              : "text-muted-foreground",
                          )}
                        >
                          {margin == null ? "—" : `${margin.toFixed(0)}%`}
                        </span>
                        {!denser ? (
                          <ChevronRight
                            className="size-4 text-muted-foreground/70"
                            aria-hidden
                          />
                        ) : null}
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

  const room =
    selectedRow && data ? (
      <CostIssuesFocus
        row={selectedRow}
        currency={currency}
        className="h-full min-h-0"
      />
    ) : data && !loading ? (
      <CostIssuesPulse
        data={data}
        rows={rows}
        onSelect={onSelect}
        className="h-full min-h-0"
      />
    ) : (
      <div className="flex h-full items-center justify-center px-6">
        <p className={cn(dashboardHintClass(), "text-center")}>
          {loading ? "Loading overview…" : "Load data to see the margin snapshot."}
        </p>
      </div>
    );

  const inspect = selectedRow ? (
    <AdjustItemCostPanel
      row={selectedRow}
      branchId={branchFilter.trim() || undefined}
      branchLabel={branchFilter ? activeBranchName : undefined}
      currency={currency}
      canAdjust={canAdjust}
      onCancel={isLg ? undefined : onClearSelection}
      onSaved={onSaved}
      className="h-full"
    />
  ) : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick an item
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          The centre shows margin health across flagged SKUs. Select a row to
          review cost, sell price, and fix the unit cost.
        </p>
      </div>
      {data && data.zeroCostCount + data.sellsAtLossCount > 0 ? (
        <p
          className={cn(
            dashboardHintClass(),
            "flex items-center gap-1.5 text-[#9a2e16]",
          )}
        >
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          {data.zeroCostCount + data.sellsAtLossCount} items with no cost or
          selling below cost
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      {alerts}
      {message ? (
        <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {message}
        </p>
      ) : null}

      <CostIssuesContextBanner
        data={data}
        loading={loading}
        activeBranchName={activeBranchName}
        rowsShown={rows.length}
      />

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
            Margin pulse
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && selectedRow ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={mobileDetailOpen}
        onOpenChange={(open) => {
          if (!open) onClearSelection();
        }}
        contextLabel="Cost issue"
        title={selectedRow?.name ?? "Item"}
        description={
          selectedRow
            ? [
                selectedRow.sku,
                ISSUE_META[selectedRow.primaryIssue].label,
              ].join(" · ")
            : undefined
        }
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
      >
        {selectedRow ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-hidden bg-white",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            <AdjustItemCostPanel
              row={selectedRow}
              branchId={branchFilter.trim() || undefined}
              branchLabel={branchFilter ? activeBranchName : undefined}
              currency={currency}
              canAdjust={canAdjust}
              onCancel={() => onClearSelection()}
              onSaved={onSaved}
              className="h-full"
            />
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
