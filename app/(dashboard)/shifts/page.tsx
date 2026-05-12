"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Building2,
  Clock,
  Coins,
  MapPin,
  Receipt,
  Search,
  X,
} from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchBranches,
  fetchCurrentShift,
  fetchShiftDetail,
  fetchShiftDrawouts,
  fetchShifts,
  type BranchRecord,
  type DenominationRecord,
  type DrawoutRecord,
  type ShiftListItem,
  type ShiftRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import {
  KES_DENOMINATIONS,
  VARIANCE_THRESHOLD_RED,
  moneyStr,
  varianceColor,
  denomTotal,
  denomsToQuantities,
  DenominationTable,
  OpenShiftModal,
  CloseShiftModal,
  DrawoutModal,
  DRAWOUT_CATEGORIES,
} from "@/components/shifts/shift-action-modals";



const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "open", label: "🟢 Open" },
  { value: "suspended", label: "🟡 Suspended" },
  { value: "closed", label: "🔴 Closed" },
  { value: "reconciled", label: "🔵 Reconciled" },
] as const;

const DRAWOUT_STATUS_BADGE: Record<string, string> = {
  PENDING_APPROVAL:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  APPROVED:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  REJECTED: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20",
  VOIDED: "bg-muted text-muted-foreground border-border/50 line-through",
  EXPIRED: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/20",
};


// ─── Helpers ─────────────────────────────────────────────────────────────


function moneyStrCompact(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-KE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-KE", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}


function varianceBgColor(v: number | string | null | undefined): string {
  if (v == null) return "";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs === 0) return "bg-emerald-500/10 border-emerald-500/20";
  if (abs < VARIANCE_THRESHOLD_RED)
    return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
    case "suspended":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20";
    case "closed":
      return "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20";
    case "reconciled":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "open":
      return "🟢 Open";
    case "suspended":
      return "🟡 Suspended";
    case "closed":
      return "🔴 Closed";
    case "reconciled":
      return "🔵 Reconciled";
    default:
      return status;
  }
}


// ─── Sub-components ──────────────────────────────────────────────────────

/** Variant badge for shift status. */
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        statusBadgeClass(status),
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

/** Shift card shown in Column 1 list. */
function ShiftCard({
  shift,
  isSelected,
  onSelect,
}: {
  shift: ShiftListItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const v = shift.variance;
  const varNum = v != null ? (typeof v === "number" ? v : Number(v)) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-all",
        "hover:border-primary/30 hover:bg-accent/40",
        isSelected
          ? "border-primary/40 bg-primary/[0.04] ring-1 ring-primary/20"
          : "border-border/70 bg-card ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">
              {shift.cashierName}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {shift.branchName}
          </p>
        </div>
        <StatusBadge status={shift.status} />
      </div>

      {/* Details row */}
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="shrink-0 text-muted-foreground">
          {fmtShortDate(shift.openedAt)}
        </span>
        <div
          className="flex min-h-[1em] min-w-8 flex-1 items-center"
          aria-hidden
        >
          <div className="h-0 w-full border-b border-dotted border-muted-foreground/35" />
        </div>
        <span className="inline-flex shrink-0 items-baseline gap-0.5 tabular-nums">
          <span className="font-medium text-foreground">
            {moneyStrCompact(shift.openingFloat)}
          </span>
          <span className="text-[6px] font-normal uppercase leading-none tracking-[0.16em] text-muted-foreground/45 sm:text-[7px]">
            KES
          </span>
        </span>
      </div>

      {/* Variance */}
      {varNum !== null ? (
        <div
          className={cn(
            "mt-1.5 flex items-center justify-between rounded-lg border px-2 py-1 text-xs",
            varianceBgColor(v),
          )}
        >
          <span className="text-muted-foreground">Variance</span>
          <span className={cn("font-semibold tabular-nums", varianceColor(v))}>
            {v != null ? `${varNum >= 0 ? "+" : ""}${moneyStrCompact(v)}` : "—"}
          </span>
        </div>
      ) : shift.status === "open" ? (
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-dashed px-2 py-1 text-xs">
          <span className="shrink-0 text-muted-foreground">Float</span>
          <div
            className="flex min-h-[1em] min-w-8 flex-1 items-center"
            aria-hidden
          >
            <div className="h-0 w-full border-b border-dotted border-muted-foreground/35" />
          </div>
          <span className="inline-flex shrink-0 items-baseline gap-0.5 tabular-nums text-foreground">
            <span className="font-medium">
              {moneyStrCompact(shift.openingFloat)}
            </span>
            <span className="text-[6px] font-normal uppercase leading-none tracking-[0.16em] text-muted-foreground/45 sm:text-[7px]">
              KES
            </span>
          </span>
        </div>
      ) : null}
    </button>
  );
}


/** Denomination comparison view (opening vs closing). */
function DenominationComparison({
  openingDenoms,
  closingDenoms,
}: {
  openingDenoms: DenominationRecord[];
  closingDenoms: DenominationRecord[];
}) {
  const openQty = denomsToQuantities(openingDenoms);
  const closeQty = denomsToQuantities(closingDenoms);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">
        Denomination Breakdown
      </h4>
      <div className={DASHBOARD_TABLE_SURFACE}>
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50 bg-muted/25">
              <th
                scope="col"
                className="px-3 py-2.5 text-left font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
              >
                Denom
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
              >
                Opening Qty
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
              >
                Opening Total
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
              >
                Closing Qty
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
              >
                Closing Total
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
              >
                Variance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {KES_DENOMINATIONS.map((d) => {
              const oQty = openQty[d.value] || 0;
              const cQty = closeQty[d.value] || 0;
              const oTotal = d.value * oQty;
              const cTotal = d.value * cQty;
              const varAmt = cTotal - oTotal;
              const hasData = oQty > 0 || cQty > 0;
              if (!hasData) return null;
              return (
                <tr key={d.value} className="transition-colors hover:bg-muted/25">
                  <td className="px-3 py-2 font-medium sm:px-4">{d.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums sm:px-4">
                    {oQty}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums sm:px-4">
                    {moneyStr(oTotal)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums sm:px-4">
                    {cQty}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums sm:px-4">
                    {moneyStr(cTotal)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right font-medium tabular-nums sm:px-4",
                      varianceColor(varAmt),
                    )}
                  >
                    {varAmt >= 0 ? "+" : ""}
                    {moneyStr(varAmt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-border/50 bg-muted/25 font-medium">
            <tr>
              <td className="px-3 py-2.5 sm:px-4">Total</td>
              <td className="px-3 py-2.5 text-right tabular-nums sm:px-4">
                {Object.values(openQty).reduce((a, b) => a + b, 0)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums sm:px-4">
                {moneyStr(denomTotal(openingDenoms))}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums sm:px-4">
                {Object.values(closeQty).reduce((a, b) => a + b, 0)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums sm:px-4">
                {moneyStr(denomTotal(closingDenoms))}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 text-right tabular-nums sm:px-4",
                  varianceColor(
                    denomTotal(closingDenoms) - denomTotal(openingDenoms),
                  ),
                )}
              >
                {moneyStr(
                  denomTotal(closingDenoms) - denomTotal(openingDenoms),
                )}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    </div>
  );
}

// ─── Open Shift Modal ─────────────────────────────────────────────────────


// ─── Drawout list sub-component ───────────────────────────────────────────

function DrawoutList({ drawouts }: { drawouts: DrawoutRecord[] }) {
  if (drawouts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No drawouts recorded for this shift.
      </p>
    );
  }

  const approvedTotal = drawouts
    .filter((d) => d.status === "APPROVED")
    .reduce(
      (s, d) =>
        s + (typeof d.amount === "number" ? d.amount : Number(d.amount)),
      0,
    );
  const pendingTotal = drawouts
    .filter((d) => d.status === "PENDING_APPROVAL")
    .reduce(
      (s, d) =>
        s + (typeof d.amount === "number" ? d.amount : Number(d.amount)),
      0,
    );
  const voidedTotal = drawouts
    .filter((d) => d.status === "VOIDED")
    .reduce(
      (s, d) =>
        s + (typeof d.amount === "number" ? d.amount : Number(d.amount)),
      0,
    );

  return (
    <div className="space-y-3">
      <div className={DASHBOARD_TABLE_SURFACE}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-muted/25">
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
                >
                  Time
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
                >
                  Recipient
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-center font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {drawouts.map((d) => (
                <tr
                  key={d.id}
                  className={cn(
                    "transition-colors hover:bg-muted/25",
                    d.status === "VOIDED" && "opacity-60",
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums sm:px-4">
                    {fmtShortDate(d.createdAt)}
                  </td>
                  <td className="px-3 py-2 sm:px-4">
                    {DRAWOUT_CATEGORIES[d.category] || d.category}
                  </td>
                  <td
                    className="max-w-[140px] truncate px-3 py-2 sm:px-4"
                    title={d.description}
                  >
                    {d.description}
                  </td>
                  <td className="px-3 py-2 sm:px-4">{d.recipientName}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums sm:px-4">
                    {moneyStr(d.amount)}
                  </td>
                  <td className="px-3 py-2 text-center sm:px-4">
                  <span
                    className={cn(
                      "inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                      DRAWOUT_STATUS_BADGE[d.status] || "",
                    )}
                  >
                    {d.status === "PENDING_APPROVAL"
                      ? "Pending"
                      : d.status === "APPROVED"
                        ? "Done"
                        : d.status === "REJECTED"
                          ? "Rejected"
                          : d.status === "VOIDED"
                            ? "Voided"
                            : d.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Totals */}
      <div className="space-y-0.5 rounded-xl border border-border/70 bg-muted/20 p-3 text-xs shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
        {approvedTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Approved Drawouts</span>
            <span className="tabular-nums font-medium text-emerald-600">
              {moneyStr(approvedTotal)}
            </span>
          </div>
        )}
        {pendingTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pending Drawouts</span>
            <span className="tabular-nums font-medium text-amber-600">
              {moneyStr(pendingTotal)}
            </span>
          </div>
        )}
        {voidedTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Voided Drawouts</span>
            <span className="tabular-nums font-medium text-muted-foreground">
              {moneyStr(voidedTotal)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-bold tabular-nums leading-tight",
          color || "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Shift Detail Panel (Column 3) ────────────────────────────────────────

function DetailTabs({ shiftId }: { shiftId: string | null }) {
  const [detail, setDetail] = useState<ShiftRecord | null>(null);
  const [activeTab, setActiveTab] = useState("denominations");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drawouts, setDrawouts] = useState<DrawoutRecord[]>([]);
  const [drawoutsLoading, setDrawoutsLoading] = useState(false);

  useEffect(() => {
    if (!shiftId) {
      setDetail(null);
      setDrawouts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchShiftDetail(shiftId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    setDrawoutsLoading(true);
    fetchShiftDrawouts(shiftId)
      .then((list) => {
        if (!cancelled) setDrawouts(list);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setDrawoutsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shiftId]);

  if (!shiftId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Select a shift to view details
        </p>
      </div>
    );
  }

  if (loading) return <DashboardLoading label="Loading shift details..." />;
  if (error) return <DashboardFeedback kind="error" text={error} />;
  if (!detail) return null;

  const openingDenoms = detail.openingDenominations || [];
  const closingDenoms = detail.closingDenominations || [];

  const tabs = [
    { id: "denominations", label: "Denominations" },
    { id: "summary", label: "Summary" },
    { id: "expenses", label: "Expenses" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-xs font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "denominations" && (
          <div className="space-y-6">
            {openingDenoms.length > 0 && closingDenoms.length > 0 ? (
              <DenominationComparison
                openingDenoms={openingDenoms}
                closingDenoms={closingDenoms}
              />
            ) : openingDenoms.length > 0 ? (
              <DenominationTable
                title="Opening Count"
                quantities={denomsToQuantities(openingDenoms)}
                readOnly
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No denomination data recorded for this shift.
              </p>
            )}
          </div>
        )}

        {activeTab === "expenses" && (
          <div>
            {drawoutsLoading ? (
              <DashboardLoading label="Loading drawouts..." />
            ) : (
              <DrawoutList drawouts={drawouts} />
            )}
          </div>
        )}

        {activeTab === "summary" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={detail.status} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shift ID</span>
                <span className="font-mono text-xs">
                  {detail.id.slice(0, 8)}…
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Opened By</span>
                <span className="font-medium">
                  {detail.openedByName || "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Opened At</span>
                <span>{fmtDate(detail.openedAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Closed At</span>
                <span>{fmtDate(detail.closedAt)}</span>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Opening Float</span>
                <span className="tabular-nums font-medium">
                  {moneyStr(detail.openingCash)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expected Cash</span>
                <span className="tabular-nums font-medium">
                  {moneyStr(detail.expectedClosingCash)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Counted Cash</span>
                <span className="tabular-nums font-medium">
                  {moneyStr(detail.countedClosingCash)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-1 mt-1">
                <span className="text-muted-foreground">Variance</span>
                <span
                  className={cn(
                    "tabular-nums font-semibold",
                    varianceColor(detail.closingVariance),
                  )}
                >
                  {moneyStr(detail.closingVariance)}
                </span>
              </div>
            </div>
            {detail.openingNotes && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Opening Notes
                </p>
                <p className="mt-1 text-sm">{detail.openingNotes}</p>
              </div>
            )}
            {detail.closingNotes && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Closing Notes
                </p>
                <p className="mt-1 text-sm">{detail.closingNotes}</p>
              </div>
            )}
            {detail.varianceReason && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Variance Reason
                </p>
                <p className="mt-1 text-sm">{detail.varianceReason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Analytics Panel (Column 2) ───────────────────────────────────────────

function AnalyticsPanel({ shiftId }: { shiftId: string | null }) {
  const [detail, setDetail] = useState<ShiftRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shiftId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchShiftDetail(shiftId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shiftId]);

  if (!shiftId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Select a shift to see analytics
        </p>
      </div>
    );
  }

  if (loading) return <DashboardLoading label="Loading analytics..." />;
  if (!detail) return null;

  const openingDenoms = detail.openingDenominations || [];
  const closingDenoms = detail.closingDenominations || [];
  const openTotal = denomTotal(openingDenoms);
  const closeTotal = denomTotal(closingDenoms);
  const expected =
    typeof detail.expectedClosingCash === "number"
      ? detail.expectedClosingCash
      : Number(detail.expectedClosingCash);
  const counted =
    detail.countedClosingCash != null
      ? typeof detail.countedClosingCash === "number"
        ? detail.countedClosingCash
        : Number(detail.countedClosingCash)
      : null;
  const variance =
    detail.closingVariance != null
      ? typeof detail.closingVariance === "number"
        ? detail.closingVariance
        : Number(detail.closingVariance)
      : null;

  return (
    <div className="space-y-4 p-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        <KpiCard label="Opening Float" value={moneyStr(detail.openingCash)} />
        <KpiCard label="Expected Cash" value={moneyStr(expected)} />
        <KpiCard
          label="Counted Cash"
          value={counted != null ? moneyStr(counted) : "—"}
          color={counted != null ? "text-foreground" : "text-muted-foreground"}
        />
        <KpiCard
          label="Variance"
          value={
            variance != null
              ? `${variance >= 0 ? "+" : ""}${moneyStr(variance)}`
              : "—"
          }
          color={varianceColor(variance)}
        />
      </div>

      {/* Denomination Breakdown */}
      {openingDenoms.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Opening Counts
          </h4>
          <div className="space-y-0.5">
            {KES_DENOMINATIONS.map((d) => {
              const qty = denomsToQuantities(openingDenoms)[d.value] || 0;
              if (qty === 0) return null;
              return (
                <div
                  key={d.value}
                  className="flex items-center justify-between rounded bg-muted/30 px-2.5 py-1 text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    {d.type === "NOTE" ? (
                      <Banknote className="size-3 text-muted-foreground" />
                    ) : (
                      <Coins className="size-3 text-muted-foreground" />
                    )}
                    <span>{d.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">×{qty}</span>
                    <span className="w-16 text-right tabular-nums font-medium">
                      {moneyStr(d.value * qty)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t pt-1 text-xs font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{moneyStr(openTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {closingDenoms.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Closing Counts
          </h4>
          <div className="space-y-0.5">
            {KES_DENOMINATIONS.map((d) => {
              const qty = denomsToQuantities(closingDenoms)[d.value] || 0;
              if (qty === 0) return null;
              return (
                <div
                  key={d.value}
                  className="flex items-center justify-between rounded bg-muted/30 px-2.5 py-1 text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    {d.type === "NOTE" ? (
                      <Banknote className="size-3 text-muted-foreground" />
                    ) : (
                      <Coins className="size-3 text-muted-foreground" />
                    )}
                    <span>{d.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">×{qty}</span>
                    <span className="w-16 text-right tabular-nums font-medium">
                      {moneyStr(d.value * qty)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t pt-1 text-xs font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{moneyStr(closeTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Timeline
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Opened</span>
            <span className="ml-auto tabular-nums text-foreground">
              {fmtShortDate(detail.openedAt)}
            </span>
          </div>
          {detail.closedAt && (
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Closed</span>
              <span className="ml-auto tabular-nums text-foreground">
                {fmtShortDate(detail.closedAt)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  const { me } = useDashboard();
  const canOpen = hasPermission(me?.permissions, Permission.ShiftsOpen);
  const canClose = hasPermission(me?.permissions, Permission.ShiftsClose);
  const canRead = hasPermission(me?.permissions, Permission.ShiftsRead);
  const allowed = canOpen || canClose || canRead;

  // Data
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // Selection
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  // Modal state
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [drawoutModal, setDrawoutModal] = useState(false);
  const [openShiftPreferredBranchId, setOpenShiftPreferredBranchId] = useState<
    string | null
  >(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const posActionHandledRef = useRef<string | null>(null);

  // Feedback
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // Load branches on mount
  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) setBranches(list.filter((b) => b.active));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  // Load shifts
  const loadShifts = useCallback(
    async (pageNum: number, append = false) => {
      setError("");
      setLoading(true);
      try {
        const result = await fetchShifts({
          branchId: branchFilter || undefined,
          status: statusFilter || undefined,
          openedBy: search || undefined,
          page: pageNum,
          size: 50,
        });
        if (append) {
          setShifts((prev) => [...prev, ...result.shifts]);
        } else {
          setShifts(result.shifts);
        }
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setPage(pageNum);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load shifts.");
      } finally {
        setLoading(false);
      }
    },
    [branchFilter, statusFilter, search],
  );

  // Load shifts on mount and when filters change
  useEffect(() => {
    loadShifts(0, false);
  }, [loadShifts]);

  // Filtered shifts (client-side search as well)
  const filteredShifts = useMemo(() => {
    if (!search.trim()) return shifts;
    const q = search.toLowerCase();
    return shifts.filter(
      (s) =>
        s.cashierName.toLowerCase().includes(q) ||
        s.branchName.toLowerCase().includes(q),
    );
  }, [shifts, search]);

  // Current open shift for quick action
  const [currentOpenShift, setCurrentOpenShift] = useState<ShiftRecord | null>(
    null,
  );

  const refreshOpenShift = useCallback(async () => {
    if (!branches.length) return;
    // Check first available branch for open shift
    for (const b of branches) {
      try {
        const s = await fetchCurrentShift(b.id);
        if (s.status === "open") {
          setCurrentOpenShift(s);
          return;
        }
      } catch {
        // no open shift for this branch, continue
      }
    }
    setCurrentOpenShift(null);
  }, [branches]);

  useEffect(() => {
    refreshOpenShift().catch(() => undefined);
  }, [refreshOpenShift]);

  /** Deep links from cashier POS (`?action=&branchId=`). */
  useEffect(() => {
    if (!allowed) return;
    const action = searchParams.get("action")?.trim();
    if (!action) {
      posActionHandledRef.current = null;
      return;
    }
    const bid = searchParams.get("branchId")?.trim() ?? "";
    const token = `${action}:${bid}`;
    if (posActionHandledRef.current === token) return;
    posActionHandledRef.current = token;

    const clearQuery = () => {
      router.replace(APP_ROUTES.shifts, { scroll: false });
    };

    if (action === "open-shift") {
      if (canOpen) {
        setOpenShiftPreferredBranchId(bid || null);
        setOpenModal(true);
      }
      clearQuery();
      return;
    }

    if (!bid || !canClose) {
      clearQuery();
      return;
    }

    if (action !== "close-shift" && action !== "new-drawout") {
      clearQuery();
      return;
    }

    void (async () => {
      try {
        const s = await fetchCurrentShift(bid);
        if (s.status !== "open") {
          setError("No open shift for that register.");
          return;
        }
        setCurrentOpenShift(s);
        if (action === "close-shift") {
          setCloseModal(true);
        } else if (action === "new-drawout") {
          setDrawoutModal(true);
        }
      } catch {
        setError("No open shift for that register.");
      } finally {
        clearQuery();
      }
    })();
  }, [allowed, searchParams, canOpen, canClose, router]);

  const handleShiftOpened = useCallback(
    (shift: ShiftRecord) => {
      setCurrentOpenShift(shift);
      setNotice("Shift opened successfully!");
      loadShifts(0, false);
    },
    [loadShifts],
  );

  const handleShiftClosed = useCallback(() => {
    setCurrentOpenShift(null);
    setNotice("Shift closed successfully!");
    loadShifts(0, false);
    setSelectedShiftId(null);
  }, [loadShifts]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Shifts"
        description={
          <>
            You need one of{" "}
            <code className="text-xs">{Permission.ShiftsOpen}</code>,{" "}
            <code className="text-xs">{Permission.ShiftsClose}</code>, or{" "}
            <code className="text-xs">{Permission.ShiftsRead}</code>.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  const selectedShift = shifts.find((s) => s.id === selectedShiftId);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 sm:px-6">
      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <DashboardPageHero
            icon={Clock}
            eyebrow="Operations"
            title="Shifts"
            description={
              <>
                Track cash drawer shifts with full denomination-level counting.
                Open a shift, count cash by KES denomination, and reconcile at
                close.
              </>
            }
          />
          <div className="flex flex-wrap gap-2 lg:shrink-0">
            {currentOpenShift && canClose ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="shadow-sm"
                  onClick={() => setDrawoutModal(true)}
                >
                  New Drawout
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setCloseModal(true)}
                >
                  Close Shift
                </Button>
              </>
            ) : null}
            {canOpen ? (
              <Button type="button" className="shadow-sm" onClick={() => setOpenModal(true)}>
                Open Shift
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-8">
          <DashboardQuickLinks
            links={[
              {
                href: APP_ROUTES.branches,
                label: "Branches",
                desc: "Locations",
                icon: MapPin,
              },
              {
                href: APP_ROUTES.salesQuick,
                label: "Quick sale",
                desc: "POS",
                icon: Receipt,
              },
              {
                href: APP_ROUTES.business,
                label: "Business",
                desc: "Settings",
                icon: Building2,
              },
            ]}
            compact
          />
        </div>
      </section>

      {(notice || error) ? (
        <div className="flex flex-col gap-3">
          {notice ? <DashboardFeedback kind="success" text={notice} /> : null}
          {error ? <DashboardFeedback kind="error" text={error} /> : null}
        </div>
      ) : null}

      {/* Three-column layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
        {/* ─── Column 1: Shift List (~28%) ────────────────────────── */}
        <div className="hidden w-[28%] min-w-[260px] flex-shrink-0 border-r border-border/50 md:flex md:flex-col">
          {/* Filters */}
          <div className="space-y-3 border-b border-border/50 bg-muted/15 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className={dashboardInputClass(loading, "pl-9 text-sm")}
                placeholder="Search cashier or branch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search shifts"
              />
            </div>
            <div className="flex gap-2">
              <select
                className={cn(dashboardSelectClass(loading), "min-w-0 flex-1 text-xs")}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                className={cn(dashboardSelectClass(loading), "min-w-0 flex-1 text-xs")}
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                aria-label="Filter by branch"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Shift cards */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-medium text-muted-foreground">
                {totalCount > 0
                  ? `${totalCount} shift${totalCount !== 1 ? "s" : ""}`
                  : "Shifts"}
              </span>
              {loading && (
                <span className="text-xs text-muted-foreground">Loading…</span>
              )}
            </div>
            <div className="space-y-2">
              {filteredShifts.map((s) => (
                <ShiftCard
                  key={s.id}
                  shift={s}
                  isSelected={selectedShiftId === s.id}
                  onSelect={() => setSelectedShiftId(s.id)}
                />
              ))}
              {filteredShifts.length === 0 && !loading && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No shifts found
                </p>
              )}
            </div>
            {hasMore && (
              <div className="mt-3 text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => loadShifts(page + 1, true)}
                >
                  {loading ? "Loading…" : "Load More"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Column 2: Analytics (~35%) ──────────────────────────── */}
        <div className="hidden w-[35%] min-w-[300px] flex-shrink-0 border-r border-border/50 lg:flex lg:flex-col">
          <div className={DASHBOARD_TABLE_HEAD}>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Shift Analytics
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AnalyticsPanel shiftId={selectedShiftId} />
          </div>
        </div>

        {/* ─── Column 3: Detail Tabs (~37%) ────────────────────────── */}
        <div className="flex flex-1 flex-col">
          <div className={DASHBOARD_TABLE_HEAD}>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {selectedShift
                ? `${selectedShift.cashierName} — ${selectedShift.branchName}`
                : "Shift Details"}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DetailTabs shiftId={selectedShiftId} />
          </div>
        </div>
      </div>

      {/* Mobile: simple list view */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4 md:hidden">
        <div className="flex items-center gap-2">
          <input
            className={cn(dashboardInputClass(loading), "min-w-0 flex-1")}
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search shifts"
          />
          {canOpen ? (
            <Button
              size="sm"
              type="button"
              className="shrink-0 shadow-sm"
              onClick={() => setOpenModal(true)}
            >
              Open
            </Button>
          ) : null}
        </div>
        <div className="space-y-2">
          {filteredShifts.map((s) => (
            <ShiftCard
              key={s.id}
              shift={s}
              isSelected={selectedShiftId === s.id}
              onSelect={() =>
                setSelectedShiftId(s.id === selectedShiftId ? null : s.id)
              }
            />
          ))}
          {filteredShifts.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No shifts found
            </p>
          )}
        </div>
        {selectedShiftId ? (
          <div className={DASHBOARD_SECTION_SURFACE}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Shift Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedShiftId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <DetailTabs shiftId={selectedShiftId} />
          </div>
        ) : null}
      </div>

      {/* Modals */}
      <OpenShiftModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setOpenShiftPreferredBranchId(null);
        }}
        branches={branches}
        preferredBranchId={openShiftPreferredBranchId}
        onOpened={handleShiftOpened}
      />
      <CloseShiftModal
        open={closeModal}
        onClose={() => setCloseModal(false)}
        shift={currentOpenShift}
        onClosed={handleShiftClosed}
      />
      {currentOpenShift && (
        <DrawoutModal
          open={drawoutModal}
          onClose={() => setDrawoutModal(false)}
          shiftId={currentOpenShift.id}
          onCreated={() => {
            setNotice("Drawout submitted.");
            setDrawoutModal(false);
          }}
        />
      )}
    </div>
  );
}
