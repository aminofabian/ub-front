"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  Calculator,
  ClipboardList,
  Clock,
  Coins,
  HandCoins,
  Layers,
  MapPin,
  Receipt,
  Scale,
  Search,
  Wallet,
  X,
} from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useSyncBranchFilter } from "@/hooks/use-session-scope";
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

function toNum(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Net cash movement (Closing − Opening) is directional, NOT a reconciliation
 * variance, so it must not reuse the red/amber severity scale. Zero is muted;
 * inflow and outflow get subtle, neutral directional cues for scanning.
 */
function changeColor(v: number | null | undefined): string {
  if (v == null || v === 0) return "text-muted-foreground";
  return v > 0
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-orange-700 dark:text-orange-400";
}

function signedMoney(v: number): string {
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${moneyStr(Math.abs(v))}`;
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
        "inline-flex items-center rounded-none border px-2 py-0.5 text-[11px] font-medium",
        statusBadgeClass(status),
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

/** Two-letter monogram for a cashier, e.g. "John Doe" → "JD". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Compact key explaining the variance colour scale (reconciliation semantics). */
function VarianceLegend({ className }: { className?: string }) {
  const items = [
    { dot: "bg-emerald-500", label: "Balanced" },
    { dot: "bg-amber-500", label: `Minor · <${VARIANCE_THRESHOLD_RED}` },
    { dot: "bg-red-500", label: `Review · ≥${VARIANCE_THRESHOLD_RED}` },
  ];
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-muted-foreground",
        className,
      )}
    >
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", it.dot)} aria-hidden />
          <span className="tabular-nums">{it.label}</span>
        </span>
      ))}
    </div>
  );
}

/** Centered empty / prompt state for the analytics + detail panes. */
function PanelEmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-none border border-border/60 bg-muted/40 text-muted-foreground/70 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {hint ? (
          <p className="mx-auto max-w-[220px] text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
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
  const accent =
    shift.status === "open"
      ? "bg-emerald-500"
      : shift.status === "suspended"
        ? "bg-amber-500"
        : shift.status === "reconciled"
          ? "bg-blue-500"
          : "bg-red-500";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-none border p-3 pl-3.5 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/40 hover:shadow-md",
        isSelected
          ? "border-primary/40 bg-primary/[0.04] shadow-sm ring-1 ring-primary/20"
          : "border-border/70 bg-card ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
      )}
    >
      {/* Status accent stripe */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1 transition-opacity",
          accent,
          isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-100",
        )}
        aria-hidden
      />

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-none border border-border/60 bg-muted/50 font-sans text-[11px] font-bold tracking-tight text-foreground shadow-sm"
            aria-hidden
          >
            {initials(shift.cashierName)}
          </span>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {shift.cashierName}
            </span>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {shift.branchName}
            </p>
          </div>
        </div>
        <StatusBadge status={shift.status} />
      </div>

      {/* Details row */}
      <div className="mt-2.5 flex items-center gap-2 text-xs">
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
            "mt-1.5 flex items-center justify-between rounded-none border px-2 py-1 text-xs",
            varianceBgColor(v),
          )}
        >
          <span className="flex items-center gap-1 text-muted-foreground">
            {Math.abs(varNum) >= VARIANCE_THRESHOLD_RED && (
              <AlertTriangle
                className="size-3 text-red-600 dark:text-red-400"
                aria-label="Large variance — needs review"
              />
            )}
            {Math.abs(varNum) >= VARIANCE_THRESHOLD_RED ? "Needs review" : "Variance"}
          </span>
          <span className={cn("font-semibold tabular-nums", varianceColor(v))}>
            {v != null ? `${varNum >= 0 ? "+" : ""}${moneyStrCompact(v)}` : "—"}
          </span>
        </div>
      ) : shift.status === "open" ? (
        <div className="mt-1.5 flex items-center gap-2 rounded-none border border-dashed px-2 py-1 text-xs">
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
  expectedClosingCash,
  countedClosingCash,
  closingVariance,
}: {
  openingDenoms: DenominationRecord[];
  closingDenoms: DenominationRecord[];
  expectedClosingCash?: number | string | null;
  countedClosingCash?: number | string | null;
  closingVariance?: number | string | null;
}) {
  const openQty = denomsToQuantities(openingDenoms);
  const closeQty = denomsToQuantities(closingDenoms);
  const openTotal = denomTotal(openingDenoms);
  const closeTotal = denomTotal(closingDenoms);
  const netChange = closeTotal - openTotal;

  const expected = toNum(expectedClosingCash);
  const counted = toNum(countedClosingCash);
  // Prefer the server-provided variance; fall back to counted − expected.
  const variance =
    toNum(closingVariance) ??
    (counted != null && expected != null ? counted - expected : null);
  const showReconciliation =
    expected != null || counted != null || variance != null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">
        Denomination Breakdown
      </h4>
      <div className={cn(DASHBOARD_TABLE_SURFACE, "rounded-none")}>
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50 bg-muted/25">
              <th
                scope="col"
                className="px-3 py-2.5 text-left font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
              >
                Denom
                <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground/60">
                  (KES)
                </span>
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
                title="Net cash movement during the shift (Closing − Opening)"
                className="px-3 py-2.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4"
              >
                Change
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {KES_DENOMINATIONS.map((d) => {
              const oQty = openQty[d.value] || 0;
              const cQty = closeQty[d.value] || 0;
              const oTotal = d.value * oQty;
              const cTotal = d.value * cQty;
              const change = cTotal - oTotal;
              const hasData = oQty > 0 || cQty > 0;
              if (!hasData) return null;
              return (
                <tr key={d.value} className="transition-colors hover:bg-muted/25">
                  <td className="px-3 py-2 font-medium tabular-nums sm:px-4">
                    {d.value.toLocaleString("en-KE")}
                  </td>
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
                      changeColor(change),
                    )}
                  >
                    {signedMoney(change)}
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
                {moneyStr(openTotal)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums sm:px-4">
                {Object.values(closeQty).reduce((a, b) => a + b, 0)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums sm:px-4">
                {moneyStr(closeTotal)}
              </td>
              <td
                className={cn(
                  "px-3 py-2.5 text-right tabular-nums sm:px-4",
                  changeColor(netChange),
                )}
              >
                {signedMoney(netChange)}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>

      <p className="px-0.5 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Change</span> = Closing −
        Opening (net cash that moved through the drawer this shift). This is not
        the reconciliation variance.
      </p>

      {showReconciliation && (
        <div className="rounded-none border border-border/70 bg-muted/20 p-3 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
          <h5 className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Drawer Reconciliation
          </h5>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Cash</span>
              <span className="tabular-nums font-medium text-foreground">
                {expected != null ? moneyStr(expected) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Counted Cash</span>
              <span className="tabular-nums font-medium text-foreground">
                {counted != null ? moneyStr(counted) : "—"}
              </span>
            </div>
            <div className="flex justify-between border-t border-border/40 pt-1">
              <span className="font-medium text-foreground">
                Variance
                <span className="ml-1 font-normal text-muted-foreground">
                  (Counted − Expected)
                </span>
              </span>
              <span
                className={cn(
                  "tabular-nums font-semibold",
                  varianceColor(variance),
                )}
              >
                {variance != null ? signedMoney(variance) : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
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
      <div className={cn(DASHBOARD_TABLE_SURFACE, "rounded-none")}>
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
                      "inline-block rounded-none border px-1.5 py-0.5 text-[10px] font-medium",
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
      <div className="space-y-0.5 rounded-none border border-border/70 bg-muted/20 p-3 text-xs shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
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
  icon: Icon,
  valueClassName,
  iconClassName,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  valueClassName?: string;
  iconClassName?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-none border border-border/70 bg-gradient-to-b from-card to-muted/25 p-3 shadow-sm ring-1 ring-black/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:ring-white/[0.04]">
      <div className="flex items-start justify-between gap-2">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-none border border-border/50 bg-background/70 text-muted-foreground shadow-sm",
              iconClassName,
            )}
            aria-hidden
          >
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 text-lg font-bold tabular-nums leading-tight tracking-tight",
          valueClassName || "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Small uppercase section heading with a leading icon chip. */
function SectionLabel({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <h4 className="flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      <Icon className="size-3.5 text-muted-foreground/70" aria-hidden />
      {text}
    </h4>
  );
}

/** Denomination list with per-row value-share proportion bars. */
function DenomStackList({
  title,
  denoms,
  total,
}: {
  title: string;
  denoms: DenominationRecord[];
  total: number;
}) {
  const qtyMap = denomsToQuantities(denoms);
  const rows = KES_DENOMINATIONS.map((d) => ({
    d,
    qty: qtyMap[d.value] || 0,
  })).filter((r) => r.qty > 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionLabel icon={Layers} text={title} />
        <span className="text-xs font-semibold tabular-nums text-foreground">
          {moneyStr(total)}
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map(({ d, qty }) => {
          const amount = d.value * qty;
          const pct = total > 0 ? Math.max(2, (amount / total) * 100) : 0;
          return (
            <div
              key={d.value}
              className="space-y-1 rounded-none border border-border/50 bg-muted/20 px-2.5 py-1.5 transition-colors hover:bg-muted/35"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {d.type === "NOTE" ? (
                    <Banknote className="size-3 text-muted-foreground" aria-hidden />
                  ) : (
                    <Coins className="size-3 text-muted-foreground" aria-hidden />
                  )}
                  <span className="tabular-nums font-medium text-foreground">
                    {d.value.toLocaleString("en-KE")}
                  </span>
                  <span className="text-muted-foreground">× {qty}</span>
                </div>
                <span className="tabular-nums font-medium text-foreground">
                  {moneyStr(amount)}
                </span>
              </div>
              <div
                className="h-1 overflow-hidden bg-border/70"
                aria-hidden
              >
                <div
                  className={cn(
                    "h-full",
                    d.type === "NOTE" ? "bg-primary/70" : "bg-primary/35",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
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
      <PanelEmptyState
        icon={ClipboardList}
        title="No shift selected"
        hint="Choose a shift to inspect its denomination breakdown, summary and drawouts."
      />
    );
  }

  if (loading) return <DashboardLoading label="Loading shift details..." />;
  if (error) return <DashboardFeedback kind="error" text={error} />;
  if (!detail) return null;

  const openingDenoms = detail.openingDenominations || [];
  const closingDenoms = detail.closingDenominations || [];

  const tabs = [
    { id: "denominations", label: "Denominations", icon: Layers },
    { id: "summary", label: "Summary", icon: ClipboardList },
    { id: "expenses", label: "Drawouts", icon: HandCoins },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar — segmented control */}
      <div className="border-b border-border/50 bg-muted/20 p-2">
        <div className="flex gap-1 rounded-none border border-border/50 bg-background/60 p-1 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-none px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                  active
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <TabIcon
                  className={cn(
                    "size-3.5",
                    active ? "text-primary" : "text-muted-foreground/70",
                  )}
                  aria-hidden
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "denominations" && (
          <div className="space-y-6">
            {openingDenoms.length > 0 && closingDenoms.length > 0 ? (
              <DenominationComparison
                openingDenoms={openingDenoms}
                closingDenoms={closingDenoms}
                expectedClosingCash={detail.expectedClosingCash}
                countedClosingCash={detail.countedClosingCash}
                closingVariance={detail.closingVariance}
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
                <span className="text-muted-foreground">
                  Variance
                  <span className="ml-1 text-xs text-muted-foreground/70">
                    (Counted − Expected)
                  </span>
                </span>
                <span
                  className={cn(
                    "tabular-nums font-semibold",
                    varianceColor(detail.closingVariance),
                  )}
                >
                  {toNum(detail.closingVariance) != null
                    ? signedMoney(toNum(detail.closingVariance) as number)
                    : "—"}
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
      <PanelEmptyState
        icon={Scale}
        title="No shift selected"
        hint="Pick a shift from the list to see its float, variance and cash movement."
      />
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
    <div className="space-y-5 p-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <KpiCard
          label="Opening Float"
          value={moneyStr(detail.openingCash)}
          icon={Wallet}
        />
        <KpiCard
          label="Expected Cash"
          value={moneyStr(expected)}
          icon={Calculator}
        />
        <KpiCard
          label="Counted Cash"
          value={counted != null ? moneyStr(counted) : "—"}
          icon={Coins}
          valueClassName={
            counted != null ? "text-foreground" : "text-muted-foreground"
          }
        />
        <KpiCard
          label="Variance"
          value={
            variance != null
              ? `${variance >= 0 ? "+" : ""}${moneyStr(variance)}`
              : "—"
          }
          icon={Scale}
          valueClassName={varianceColor(variance)}
          iconClassName={cn(
            variance != null && Math.abs(variance) === 0 &&
              "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            variance != null &&
              Math.abs(variance) > 0 &&
              Math.abs(variance) < VARIANCE_THRESHOLD_RED &&
              "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
            variance != null &&
              Math.abs(variance) >= VARIANCE_THRESHOLD_RED &&
              "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
          )}
        />
      </div>

      {/* Denomination Breakdowns */}
      {openingDenoms.length > 0 && (
        <DenomStackList
          title="Opening Counts"
          denoms={openingDenoms}
          total={openTotal}
        />
      )}
      {closingDenoms.length > 0 && (
        <DenomStackList
          title="Closing Counts"
          denoms={closingDenoms}
          total={closeTotal}
        />
      )}

      {/* Timeline */}
      <div className="space-y-2">
        <SectionLabel icon={Clock} text="Timeline" />
        <div className="relative space-y-3 pl-1 text-xs">
          <span
            className="absolute bottom-1.5 left-[4px] top-1.5 w-px bg-border"
            aria-hidden
          />
          <div className="relative flex items-center gap-2.5">
            <span className="z-10 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            <span className="text-muted-foreground">Opened</span>
            <span className="ml-auto tabular-nums font-medium text-foreground">
              {fmtShortDate(detail.openedAt)}
            </span>
          </div>
          {detail.closedAt && (
            <div className="relative flex items-center gap-2.5">
              <span className="z-10 size-2 rounded-full bg-red-500 ring-2 ring-background" />
              <span className="text-muted-foreground">Closed</span>
              <span className="ml-auto tabular-nums font-medium text-foreground">
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
  const branchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  // Report page: follow the header branch, allowing an empty "All branches" view.
  const { branchLocked: isBranchLockedRole } = useSyncBranchFilter({
    value: branchFilter,
    setValue: setBranchFilter,
    availableIds: branches.length > 0 ? branchIds : undefined,
    allowAll: true,
  });

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

    if (isBranchLockedRole) {
      const bid = me?.branchId?.trim();
      if (!bid || !branches.some((b) => b.id === bid)) {
        setCurrentOpenShift(null);
        return;
      }
      try {
        const s = await fetchCurrentShift(bid);
        if (s.status === "open") {
          setCurrentOpenShift(s);
          return;
        }
      } catch {
        setCurrentOpenShift(null);
        return;
      }
      setCurrentOpenShift(null);
      return;
    }

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
  }, [branches, isBranchLockedRole, me?.branchId]);

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
        const assigned = me?.branchId?.trim();
        setOpenShiftPreferredBranchId(
          isBranchLockedRole ? assigned || null : bid || null,
        );
        setOpenModal(true);
      }
      clearQuery();
      return;
    }

    if (!bid || !canClose) {
      clearQuery();
      return;
    }

    if (isBranchLockedRole) {
      const assigned = me?.branchId?.trim();
      if (!assigned || bid !== assigned) {
        setError("That register is not available for your account.");
        clearQuery();
        return;
      }
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
  }, [allowed, searchParams, canOpen, canClose, router, isBranchLockedRole, me?.branchId]);

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
      <section className={cn(DASHBOARD_SECTION_SURFACE, "rounded-none p-4 sm:p-5")}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          {/* Identity */}
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center border border-border/60 bg-muted/50 text-foreground shadow-sm">
              <Clock className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <span className="block font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Operations
              </span>
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
                Shifts
              </h1>
              <ActiveScopeSubtitle className="mt-0.5 text-xs" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
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

        {/* Description + quick links */}
        <div className="mt-4 flex flex-col gap-3 border-t border-border/50 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Track cash drawer shifts with full denomination-level counting. Open
            a shift, count cash by KES denomination, and reconcile at close.
          </p>
          <div className="flex flex-wrap gap-2 lg:shrink-0">
            {[
              ...(isBranchLockedRole
                ? []
                : [
                    {
                      href: APP_ROUTES.branches,
                      label: "Branches",
                      icon: MapPin,
                    },
                  ]),
              { href: APP_ROUTES.salesQuick, label: "Quick sale", icon: Receipt },
              { href: APP_ROUTES.business, label: "Business", icon: Building2 },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 border border-border/60 bg-card/90 px-2.5 py-1.5 text-xs font-semibold tracking-tight text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Icon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                {label}
                <ArrowRight
                  className="size-3 shrink-0 text-muted-foreground opacity-60"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {(notice || error) ? (
        <div className="flex flex-col gap-3">
          {notice ? <DashboardFeedback kind="success" text={notice} /> : null}
          {error ? <DashboardFeedback kind="error" text={error} /> : null}
        </div>
      ) : null}

      {/* Reconciliation console */}
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-none border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.02] md:flex dark:ring-white/[0.04]">
        {/* Console toolbar */}
        <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-gradient-to-r from-muted/45 via-muted/20 to-transparent px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-none border border-border/60 bg-background/70 text-primary shadow-sm">
              <Scale className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="font-heading text-base font-semibold leading-tight tracking-tight text-foreground">
                Reconciliation Console
              </h2>
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                Opening float → sales → close-out variance
              </p>
            </div>
          </div>
          <VarianceLegend className="justify-end" />
        </div>

        {/* Panels */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ─── Column 1: Shift List (~28%) ────────────────────────── */}
        <div className="flex w-[28%] min-w-[260px] flex-shrink-0 flex-col border-r border-border/50">
          {/* Filters */}
          <div className="space-y-3 border-b border-border/50 bg-muted/15 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className={dashboardInputClass(loading, "pl-9 text-sm rounded-none")}
                placeholder="Search cashier or branch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search shifts"
              />
            </div>
            <div className="flex gap-2">
              <select
                className={cn(dashboardSelectClass(loading), "min-w-0 flex-1 text-xs rounded-none")}
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
                className={cn(dashboardSelectClass(loading), "min-w-0 flex-1 text-xs rounded-none")}
                value={branchFilter}
                disabled={isBranchLockedRole}
                onChange={(e) => setBranchFilter(e.target.value)}
                aria-label="Filter by branch"
              >
                {isBranchLockedRole ? null : (
                  <option value="">All Branches</option>
                )}
                {branches
                  .filter((b) => !isBranchLockedRole || b.id === me?.branchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Shift cards */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                Shifts
                <span className="inline-flex min-w-5 items-center justify-center rounded-none border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {totalCount}
                </span>
              </span>
              {loading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  Loading…
                </span>
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
          <div className="flex items-center gap-2 border-b border-border/50 bg-muted/25 px-4 py-3">
            <Calculator className="size-4 text-muted-foreground" aria-hidden />
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
          <div className="flex items-center gap-2.5 border-b border-border/50 bg-muted/25 px-4 py-3">
            {selectedShift ? (
              <>
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-none border border-border/60 bg-background/70 font-sans text-[11px] font-bold tracking-tight text-foreground shadow-sm"
                  aria-hidden
                >
                  {initials(selectedShift.cashierName)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold leading-tight tracking-tight text-foreground">
                    {selectedShift.cashierName}
                  </h3>
                  <p className="truncate text-[11px] leading-tight text-muted-foreground">
                    {selectedShift.branchName}
                  </p>
                </div>
                <StatusBadge status={selectedShift.status} />
              </>
            ) : (
              <>
                <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Shift Details
                </h3>
              </>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <DetailTabs shiftId={selectedShiftId} />
          </div>
        </div>
        </div>
      </div>

      {/* Mobile: simple list view */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4 md:hidden">
        <div className="flex items-center gap-2">
          <input
            className={cn(dashboardInputClass(loading), "min-w-0 flex-1 rounded-none")}
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
          <div className={cn(DASHBOARD_SECTION_SURFACE, "rounded-none")}>
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
        lockBranchSelectionTo={isBranchLockedRole ? me?.branchId ?? null : null}
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
