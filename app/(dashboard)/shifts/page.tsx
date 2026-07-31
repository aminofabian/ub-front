"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calculator,
  ChevronRight,
  ClipboardList,
  Clock,
  Coins,
  FileText,
  HandCoins,
  Layers,
  MapPin,
  Pencil,
  Receipt,
  Scale,
  Search,
  Wallet,
  X,
} from "lucide-react";

import {
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
  EditOpeningCountModal,
  CloseShiftModal,
  DrawoutModal,
  DRAWOUT_CATEGORIES,
} from "@/components/shifts/shift-action-modals";

/* ═══════════════════════════════════════════════════════════════════════════
 * THE SHIFTS BOARD — direction contract
 *
 * THESIS: one time-ranked departure board for the till. Shifts are rows on a
 *   fixed grid — cashier, branch, opened, float, variance — restyled by state,
 *   and the live shift is the board's "now" row. Refuses the three-panel
 *   console (list | analytics | details) that crushes content at laptop width.
 *
 * OWN-WORLD: the dashboard's quiet paper surface; rows as departure-board
 *   entries with a 2px state rail and fixed tabular columns; one accent
 *   (primary) for selection and the live strip; ledger figures in mono.
 *
 * STORY: the manager scans the board, sees what is live, picks a row, and the
 *   detail pane gives the full cash story — overview, counts, drawouts —
 *   without a single element feeling cut off.
 *
 * FIRST VIEWPORT: page header with actions; the open-shift "Now" banner; then
 *   the board: a list rail (~22rem) and a detail pane filling the rest.
 *
 * FORM: split-flap concourse grammar (challenger) fused into the dashboard's
 *   Operate world; grounded candidate 5; seed 5d7b883e.
 *
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 *   finish review, the verdict, and DESIGN.md.
 * ═══════════════════════════════════════════════════════════════════════════ */

const STATUS_OPTIONS = [
  { value: "", label: "All shifts" },
  { value: "open", label: "Open" },
  { value: "suspended", label: "Suspended" },
  { value: "closed", label: "Closed" },
  { value: "reconciled", label: "Reconciled" },
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

/** Ledger convention: money renders in monospace tabular figures. */
const NUM = "font-mono tabular-nums";

/** Soft raised surface shared across the board's panels. */
const CARD = "border border-border/60 bg-card shadow-sm";

// ─── Helpers ───────────────────────────────────────────────────────────────

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
 * Net cash movement (Closing − Opening) is directional, not a variance, so it
 * never reuses the red/amber severity scale. Zero is muted; inflow and outflow
 * get subtle, neutral directional cues for scanning.
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
      return "Open";
    case "suspended":
      return "Suspended";
    case "closed":
      return "Closed";
    case "reconciled":
      return "Reconciled";
    default:
      return status;
  }
}

/** Severity dot hue for a variance figure — shared with the legend. */
function varianceDot(v: number | null | undefined): string | null {
  if (v == null) return null;
  const abs = Math.abs(v);
  if (abs === 0) return "bg-emerald-500";
  if (abs < VARIANCE_THRESHOLD_RED) return "bg-amber-500";
  return "bg-red-500";
}

/** Status dot hue — the board's row-state vocabulary. */
function statusDotClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-emerald-500";
    case "suspended":
      return "bg-amber-500";
    case "closed":
      return "bg-red-500";
    case "reconciled":
      return "bg-blue-500";
    default:
      return "bg-muted-foreground";
  }
}

/** Status rail hue — the 2px left rail on board rows and banners. */
function statusRailClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-emerald-500";
    case "suspended":
      return "bg-amber-500";
    case "closed":
      return "bg-red-500";
    case "reconciled":
      return "bg-blue-500";
    default:
      return "bg-border";
  }
}

/** Two-letter monogram for a cashier, e.g. "John Doe" → "JD". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Shared atoms ──────────────────────────────────────────────────────────

/** Variant badge for shift status. */
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[11px] font-semibold",
        statusBadgeClass(status),
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", statusDotClass(status))}
        aria-hidden
      />
      {statusLabel(status)}
    </span>
  );
}

/** Compact key explaining the variance colour scale. */
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

/** Centered empty / prompt state for a pane. */
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
      <span className="flex size-12 items-center justify-center border border-border/60 bg-muted/40 text-muted-foreground/70 shadow-sm">
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

/** Receipt-style row with a dotted leader connecting label to figure. */
function LeaderRow({
  label,
  value,
  valueClassName,
  strong,
}: {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt
        className={cn(
          "shrink-0 text-muted-foreground",
          strong && "font-medium text-foreground",
        )}
      >
        {label}
      </dt>
      <span
        className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-border/60"
        aria-hidden
      />
      <dd className={cn("shrink-0 font-medium text-foreground", NUM, valueClassName)}>
        {value}
      </dd>
    </div>
  );
}

/** Free-text note / reason block with an icon label. */
function NoteBlock({
  icon: Icon,
  label,
  text,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  text: string;
  tone?: "default" | "flag";
}) {
  const flag = tone === "flag";
  return (
    <div
      className={cn(
        "space-y-1.5 border p-3",
        flag
          ? "border-amber-500/30 bg-amber-500/[0.06]"
          : "border-border/60 bg-muted/15",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            flag ? "text-amber-600 dark:text-amber-400" : "text-foreground/45",
          )}
          aria-hidden
        />
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/70">
          {label}
        </span>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
        {text}
      </p>
    </div>
  );
}

/** Small uppercase section heading with a leading icon. */
function SectionLabel({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <h4 className="flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/70">
      <Icon className="size-3.5 text-foreground/45" aria-hidden />
      {text}
    </h4>
  );
}

// ─── KPI card ──────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  valueClassName,
  dotClassName,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  valueClassName?: string;
  dotClassName?: string | null;
}) {
  return (
    <div className="border border-border/60 bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground/70">
          {label}
        </p>
        {dotClassName ? (
          <span
            className={cn("size-2 shrink-0 rounded-full", dotClassName)}
            aria-hidden
          />
        ) : Icon ? (
          <Icon
            className="size-3.5 shrink-0 text-foreground/40"
            aria-hidden
          />
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1.5 text-lg font-bold leading-tight tracking-tight sm:text-xl",
          NUM,
          valueClassName || "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Board row (departure-board grammar) ───────────────────────────────────

/**
 * One shift as a row on the board. Fixed columns that never move; the 2px
 * status rail and dot carry the row's state; the variance chip signals the
 * close-out. Selected rows lift with a primary rail and soft fill.
 */
function ShiftRow({
  shift,
  isSelected,
  onSelect,
  compact = false,
}: {
  shift: ShiftListItem;
  isSelected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const v = shift.variance;
  const varNum = v != null ? (typeof v === "number" ? v : Number(v)) : null;
  const needsReview = varNum != null && Math.abs(varNum) >= VARIANCE_THRESHOLD_RED;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        "group relative w-full overflow-hidden border text-left transition-all duration-150",
        isSelected
          ? "border-primary/40 bg-primary/[0.05] shadow-sm"
          : "border-border/60 bg-card hover:border-border hover:bg-muted/30 hover:shadow-sm",
        compact && "p-2.5",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-0.5 transition-opacity duration-150",
          isSelected
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-60",
          statusRailClass(shift.status),
        )}
        aria-hidden
      />

      <div className={cn("flex items-start justify-between gap-2", compact ? "" : "p-3")}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center border border-border/60 bg-muted/40 font-sans text-[11px] font-bold tracking-tight text-foreground",
            )}
            aria-hidden
          >
            {initials(shift.cashierName)}
          </span>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {shift.cashierName}
            </span>
            <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{shift.branchName}</span>
            </span>
          </div>
        </div>
        <StatusBadge status={shift.status} />
      </div>

      <div
        className={cn(
          "flex items-center gap-2 text-xs",
          compact ? "mt-2" : "mt-2.5 px-3",
        )}
      >
        <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground">
          <Clock className="size-3" aria-hidden />
          <span className={NUM}>{fmtShortDate(shift.openedAt)}</span>
        </span>
        <span className="h-3 w-px bg-border/70" aria-hidden />
        <span className="inline-flex shrink-0 items-baseline gap-0.5 text-muted-foreground">
          <span>Float</span>
          <span className={cn("font-medium text-foreground", NUM)}>
            {moneyStrCompact(shift.openingFloat)}
          </span>
        </span>

        {varNum !== null ? (
          <>
            <span className="ml-auto" aria-hidden />
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 font-medium",
                NUM,
                varianceBgColor(v),
                needsReview && "text-red-700 dark:text-red-300",
              )}
            >
              {needsReview ? (
                <AlertTriangle className="size-3 text-red-600 dark:text-red-400" aria-label="Needs review" />
              ) : null}
              {varNum >= 0 ? "+" : ""}
              {moneyStrCompact(v)}
            </span>
          </>
        ) : shift.status === "open" ? (
          <>
            <span className="ml-auto" aria-hidden />
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </>
        ) : null}
      </div>
    </button>
  );
}

// ─── Denominations ─────────────────────────────────────────────────────────

/** Denomination list rendered as a clean ledger card. */
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
    <div className={CARD}>
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/25 px-3 py-2">
        <SectionLabel icon={Layers} text={title} />
        <span className={cn("text-sm font-bold text-foreground", NUM)}>
          {moneyStr(total)}
        </span>
      </div>
      <div className="divide-y divide-border/30">
        {rows.map(({ d, qty }) => {
          const amount = d.value * qty;
          return (
            <div
              key={d.value}
              className="flex items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-muted/20"
            >
              <span className="flex items-center gap-1.5">
                {d.type === "NOTE" ? (
                  <Banknote className="size-3 text-foreground/40" aria-hidden />
                ) : (
                  <Coins className="size-3 text-foreground/40" aria-hidden />
                )}
                <span className={cn("font-medium text-muted-foreground", NUM)}>
                  {d.value.toLocaleString("en-KE")}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground/70">
                  × {qty}
                </span>
              </span>
              <span className={cn("font-semibold text-foreground", NUM)}>
                {moneyStr(amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
  expectedClosingCash: number | string | null;
  countedClosingCash: number | string | null;
  closingVariance: number | string | null;
}) {
  const openQty = denomsToQuantities(openingDenoms);
  const closeQty = denomsToQuantities(closingDenoms);
  const openTotal = denomTotal(openingDenoms);
  const closeTotal = denomTotal(closingDenoms);
  const netChange = closeTotal - openTotal;
  const expected = toNum(expectedClosingCash);
  const counted = toNum(countedClosingCash);
  const variance = toNum(closingVariance);
  const showReconciliation = expected != null || counted != null || variance != null;

  return (
    <div className="space-y-3">
      <div className={cn(DASHBOARD_TABLE_SURFACE, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-muted/25">
                <th
                  scope="col"
                  className="px-3 py-2 text-left font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
                >
                  Denom
                  <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground/60">
                    (KES)
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
                >
                  Opening
                  <span className="block text-[9px] font-normal normal-case tracking-normal text-muted-foreground/55">
                    qty · total
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
                >
                  Closing
                  <span className="block text-[9px] font-normal normal-case tracking-normal text-muted-foreground/55">
                    qty · total
                  </span>
                </th>
                <th
                  scope="col"
                  title="Net cash movement during the shift (Closing − Opening)"
                  className="px-3 py-2 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
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
                    <td className="px-3 py-1.5 font-medium font-mono tabular-nums sm:px-4">
                      {d.value.toLocaleString("en-KE")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right sm:px-4">
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {oQty}
                      </span>
                      <span className="mx-1 text-muted-foreground/40">·</span>
                      <span className="font-mono tabular-nums text-foreground">
                        {moneyStr(oTotal)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right sm:px-4">
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {cQty}
                      </span>
                      <span className="mx-1 text-muted-foreground/40">·</span>
                      <span className="font-mono tabular-nums text-foreground">
                        {moneyStr(cTotal)}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-1.5 text-right font-medium font-mono tabular-nums sm:px-4",
                        changeColor(change),
                      )}
                    >
                      {signedMoney(change)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-border/50 bg-muted/30 font-semibold">
              <tr>
                <td className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4">
                  Total
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right sm:px-4">
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {Object.values(openQty).reduce((a, b) => a + b, 0)}
                  </span>
                  <span className="mx-1 text-muted-foreground/40">·</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {moneyStr(openTotal)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right sm:px-4">
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {Object.values(closeQty).reduce((a, b) => a + b, 0)}
                  </span>
                  <span className="mx-1 text-muted-foreground/40">·</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {moneyStr(closeTotal)}
                  </span>
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-mono tabular-nums sm:px-4",
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

      {showReconciliation ? (
        <div className={cn(CARD, "p-3.5")}>
          <div className="mb-2 flex items-center gap-1.5">
            <Scale className="size-3.5 text-muted-foreground/70" aria-hidden />
            <h5 className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70">
              Drawer Reconciliation
            </h5>
          </div>
          <dl className="space-y-1 text-xs">
            <LeaderRow
              label="Expected"
              value={expected != null ? moneyStr(expected) : "—"}
            />
            <LeaderRow
              label="Counted"
              value={counted != null ? moneyStr(counted) : "—"}
            />
            <div className="flex items-baseline gap-2 border-t border-dashed border-border/60 pt-2">
              <dt className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-foreground">
                Variance
              </dt>
              <span
                className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-border/60"
                aria-hidden
              />
              <dd
                className={cn(
                  "shrink-0 text-sm font-bold",
                  NUM,
                  varianceColor(variance),
                )}
              >
                {variance != null ? signedMoney(variance) : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-2 border-t border-border/40 pt-2 text-[10px] leading-relaxed text-muted-foreground">
            Variance = Counted − Expected. The{" "}
            <span className="font-medium text-foreground">Change</span> column
            above is Closing − Opening (cash movement), not variance.
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Drawouts ──────────────────────────────────────────────────────────────

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
      <div className={cn(DASHBOARD_TABLE_SURFACE, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-muted/25">
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
                >
                  Time
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
                >
                  Recipient
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-center font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
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
                  <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums sm:px-4">
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
                  <td className="px-3 py-2 text-right font-medium font-mono tabular-nums sm:px-4">
                    {moneyStr(d.amount)}
                  </td>
                  <td className="px-3 py-2 text-center sm:px-4">
                    <span
                      className={cn(
                        "inline-block border px-1.5 py-0.5 text-[10px] font-medium",
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
      <dl className={cn(CARD, "space-y-1 p-3.5 text-xs")}>
        {approvedTotal > 0 && (
          <LeaderRow
            label="Approved drawouts"
            value={moneyStr(approvedTotal)}
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
        )}
        {pendingTotal > 0 && (
          <LeaderRow
            label="Pending drawouts"
            value={moneyStr(pendingTotal)}
            valueClassName="text-amber-600 dark:text-amber-400"
          />
        )}
        {voidedTotal > 0 && (
          <LeaderRow
            label="Voided drawouts"
            value={moneyStr(voidedTotal)}
            valueClassName="text-muted-foreground"
          />
        )}
      </dl>
    </div>
  );
}

// ─── Detail pane ───────────────────────────────────────────────────────────

function ShiftDetail({
  shiftId,
  canUpdateOpening,
  onOpeningUpdated,
}: {
  shiftId: string | null;
  canUpdateOpening?: boolean;
  onOpeningUpdated?: () => void;
}) {
  const [detail, setDetail] = useState<ShiftRecord | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drawouts, setDrawouts] = useState<DrawoutRecord[]>([]);
  const [drawoutsLoading, setDrawoutsLoading] = useState(false);
  const [editOpeningOpen, setEditOpeningOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!shiftId) {
      setDetail(null);
      setDrawouts([]);
      setEditOpeningOpen(false);
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
  }, [shiftId, reloadToken]);

  if (!shiftId) {
    return (
      <PanelEmptyState
        icon={ClipboardList}
        title="No shift selected"
        hint="Choose a shift on the board to inspect its overview, counts and drawouts."
      />
    );
  }

  if (loading) return <DashboardLoading label="Loading shift details..." />;
  if (error) return <DashboardFeedback kind="error" text={error} />;
  if (!detail) return null;

  const openingDenoms = detail.openingDenominations || [];
  const closingDenoms = detail.closingDenominations || [];
  const opening = toNum(detail.openingCash);
  const expected = toNum(detail.expectedClosingCash);
  const counted = toNum(detail.countedClosingCash);
  const variance = toNum(detail.closingVariance);
  const cashMovement =
    opening != null && expected != null ? expected - opening : null;
  const isOpenShift = detail.status === "open";
  const showEditOpening = Boolean(canUpdateOpening && isOpenShift);

  const tabs = [
    { id: "overview", label: "Overview", icon: ClipboardList },
    { id: "counts", label: "Counts", icon: Layers },
    { id: "drawouts", label: "Drawouts", icon: HandCoins },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Segmented tab bar */}
      <div className="border-b border-border/50 p-2">
        <div className="flex gap-1 border border-border/50 bg-muted/20 p-1">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={active}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                  active
                    ? "bg-card text-foreground shadow-sm"
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
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Cash KPIs */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
              <KpiCard
                label="Opening Float"
                value={moneyStr(detail.openingCash)}
                icon={Wallet}
              />
              <KpiCard
                label="Expected Cash"
                value={expected != null ? moneyStr(expected) : "—"}
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
                value={variance != null ? signedMoney(variance) : "—"}
                icon={Scale}
                dotClassName={varianceDot(variance)}
                valueClassName={varianceColor(variance)}
              />
            </div>

            {/* Cash movement */}
            {cashMovement != null ? (
              <div className="flex items-center justify-between gap-2 border border-border/60 bg-muted/20 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground/70">
                    Cash movement
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    Expected − Opening
                  </p>
                </div>
                <p className={cn("shrink-0 text-sm font-semibold", NUM, changeColor(cashMovement))}>
                  {signedMoney(cashMovement)}
                </p>
              </div>
            ) : null}

            {/* Timeline */}
            <div className="space-y-2">
              <SectionLabel icon={Clock} text="Timeline" />
              <div className="relative space-y-2 pl-1 text-xs">
                <span
                  className="absolute bottom-1.5 left-[4px] top-1.5 w-px bg-border"
                  aria-hidden
                />
                <div className="relative flex items-center gap-2.5">
                  <span className="z-10 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                  <span className="text-muted-foreground">Opened</span>
                  <span className={cn("ml-auto font-medium text-foreground", NUM)}>
                    {fmtShortDate(detail.openedAt)}
                  </span>
                </div>
                {detail.closedAt ? (
                  <div className="relative flex items-center gap-2.5">
                    <span className="z-10 size-2 rounded-full bg-red-500 ring-2 ring-background" />
                    <span className="text-muted-foreground">Closed</span>
                    <span className={cn("ml-auto font-medium text-foreground", NUM)}>
                      {fmtShortDate(detail.closedAt)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Notes */}
            {detail.varianceReason ? (
              <NoteBlock
                icon={AlertTriangle}
                label="Variance reason"
                text={detail.varianceReason}
                tone={variance ? "flag" : "default"}
              />
            ) : null}
            {detail.openingNotes || detail.closingNotes ? (
              <div className="space-y-2">
                {detail.openingNotes ? (
                  <NoteBlock
                    icon={FileText}
                    label="Opening notes"
                    text={detail.openingNotes}
                  />
                ) : null}
                {detail.closingNotes ? (
                  <NoteBlock
                    icon={FileText}
                    label="Closing notes"
                    text={detail.closingNotes}
                  />
                ) : null}
              </div>
            ) : null}

            {showEditOpening ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 w-full gap-1.5 rounded-none text-xs"
                onClick={() => setEditOpeningOpen(true)}
              >
                <Pencil className="size-3" aria-hidden />
                Edit opening float
              </Button>
            ) : null}
          </div>
        )}

        {activeTab === "counts" && (
          <div className="space-y-3">
            {showEditOpening ? (
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 rounded-none px-2 text-xs"
                  onClick={() => setEditOpeningOpen(true)}
                >
                  <Pencil className="size-3" aria-hidden />
                  Edit opening
                </Button>
              </div>
            ) : null}
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
                {showEditOpening
                  ? " Use Edit opening to add a count."
                  : null}
              </p>
            )}
          </div>
        )}

        {activeTab === "drawouts" && (
          <div>
            {drawoutsLoading ? (
              <DashboardLoading label="Loading drawouts..." />
            ) : (
              <DrawoutList drawouts={drawouts} />
            )}
          </div>
        )}
      </div>

      <EditOpeningCountModal
        open={editOpeningOpen}
        onClose={() => setEditOpeningOpen(false)}
        shift={detail}
        onUpdated={() => {
          setReloadToken((n) => n + 1);
          onOpeningUpdated?.();
        }}
      />
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  const { me } = useDashboard();
  const canOpen = hasPermission(me?.permissions, Permission.ShiftsOpen);
  const canClose = hasPermission(me?.permissions, Permission.ShiftsClose);
  const canRead = hasPermission(me?.permissions, Permission.ShiftsRead);
  const canUpdateOpening = hasPermission(
    me?.permissions,
    Permission.ShiftsUpdate,
  );
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const allowed = canOpen || canClose || canRead;

  // Data
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // Selection
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

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

  // Current open shift for the board's "now" row
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

  const quickLinks = [
    ...(isBranchLockedRole
      ? []
      : [{ href: APP_ROUTES.branches, label: "Branches", icon: MapPin }]),
    roleKey === "cashier"
      ? { href: APP_ROUTES.cashier, label: "Cashier", icon: Receipt }
      : { href: APP_ROUTES.salesQuick, label: "Quick sale", icon: Receipt },
    ...(roleKey === "cashier"
      ? []
      : [{ href: APP_ROUTES.business, label: "Business", icon: Building2 }]),
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1440px] flex-col gap-4 px-4 pb-16 sm:px-6 sm:gap-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-[1.75rem]">
            Shifts
          </h1>
          <ActiveScopeSubtitle className="mt-1 text-xs" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentOpenShift && canClose ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-none shadow-sm"
                onClick={() => setDrawoutModal(true)}
              >
                <HandCoins className="size-4" aria-hidden />
                New drawout
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-none"
                onClick={() => setCloseModal(true)}
              >
                Close shift
              </Button>
            </>
          ) : null}
          {canOpen ? (
            <Button type="button" className="rounded-none shadow-sm" onClick={() => setOpenModal(true)}>
              Open shift
            </Button>
          ) : null}
        </div>
      </header>

      {/* ── Board toolbar links ───────────────────────────────── */}
      {quickLinks.length > 0 ? (
        <nav aria-label="Related pages" className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
          {quickLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-1.5 px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      ) : null}

      {(notice || error) ? (
        <div className="flex flex-col gap-3">
          {notice ? <DashboardFeedback kind="success" text={notice} /> : null}
          {error ? <DashboardFeedback kind="error" text={error} /> : null}
        </div>
      ) : null}

      {/* ── Live "now" row ─────────────────────────────────────── */}
      {currentOpenShift ? (
        <section
          aria-label="Open shift"
          className={cn(
            "relative flex flex-wrap items-center gap-x-4 gap-y-2 overflow-hidden border border-emerald-500/25 bg-emerald-500/[0.05] px-4 py-3",
          )}
        >
          <span className="absolute inset-y-0 left-0 w-0.5 bg-emerald-500" aria-hidden />
          <span className="relative flex items-center gap-2.5">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" aria-hidden />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-foreground">
              {currentOpenShift.openedByName || "Cashier"}
              <span className="font-normal text-muted-foreground"> at </span>
              {currentOpenShift.branchName}
            </p>
          </span>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            Since <span className={NUM}>{fmtShortDate(currentOpenShift.openedAt)}</span>
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wallet className="size-3.5" aria-hidden />
            Float{" "}
            <span className={cn("font-semibold text-foreground", NUM)}>
              {moneyStr(currentOpenShift.openingCash)}
            </span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            {canClose ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => setDrawoutModal(true)}
                >
                  New drawout
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="rounded-none"
                  onClick={() => setCloseModal(true)}
                >
                  Close shift
                </Button>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── The board: list rail + detail pane ─────────────────── */}
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Board rail */}
        <section
          aria-label="Shift board"
          className={cn(CARD, "flex min-h-[24rem] flex-col overflow-hidden md:min-h-0")}
        >
          {/* Rail toolbar */}
          <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center border border-border/60 bg-muted/40 text-primary">
                <Layers className="size-3.5" aria-hidden />
              </span>
              <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
                Board
              </h2>
              <span className="inline-flex min-w-5 items-center justify-center border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                {totalCount}
              </span>
            </div>
            <VarianceLegend className="hidden sm:flex" />
          </div>

          {/* Filters */}
          <div className="space-y-1.5 border-b border-border/50 bg-muted/10 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                className={cn(dashboardInputClass(loading), "rounded-none pl-8 text-sm")}
                placeholder="Search cashier or branch…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search shifts"
              />
            </div>
            <div className="flex gap-1.5">
              <select
                className={cn(dashboardSelectClass(loading), "min-w-0 flex-1 rounded-none text-xs")}
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
                className={cn(dashboardSelectClass(loading), "min-w-0 flex-1 rounded-none text-xs")}
                value={branchFilter}
                disabled={isBranchLockedRole}
                onChange={(e) => setBranchFilter(e.target.value)}
                aria-label="Filter by branch"
              >
                {isBranchLockedRole ? null : (
                  <option value="">All branches</option>
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

          {/* Rows */}
          <div className="flex-1 space-y-1.5 overflow-y-auto p-2.5">
            {filteredShifts.map((s) => (
              <ShiftRow
                key={s.id}
                shift={s}
                isSelected={selectedShiftId === s.id}
                onSelect={() => setSelectedShiftId(s.id)}
              />
            ))}
            {filteredShifts.length === 0 && !loading ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Search className="size-5 text-muted-foreground/50" aria-hidden />
                <p className="text-sm font-medium text-foreground">
                  {shifts.length === 0 ? "No shifts yet" : "No shifts match"}
                </p>
                <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
                  {shifts.length === 0
                    ? "Open a shift to begin tracking cash for the day."
                    : "Broaden your search or clear the filters."}
                </p>
              </div>
            ) : null}
            {hasMore ? (
              <div className="pt-1 text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-none"
                  disabled={loading}
                  onClick={() => loadShifts(page + 1, true)}
                >
                  {loading ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        {/* Detail pane */}
        <section
          aria-label="Shift details"
          className={cn(CARD, "hidden min-h-0 flex-col overflow-hidden md:flex")}
        >
          {selectedShift ? (
            <div className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center border border-border/60 bg-muted/40 font-sans text-[11px] font-bold tracking-tight text-foreground"
                aria-hidden
              >
                {initials(selectedShift.cashierName)}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold leading-tight tracking-tight text-foreground">
                  {selectedShift.cashierName}
                </h3>
                <p className="flex items-center gap-1 truncate text-[11px] leading-tight text-muted-foreground">
                  <MapPin className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{selectedShift.branchName}</span>
                  <span aria-hidden>·</span>
                  <span className={NUM}>{fmtShortDate(selectedShift.openedAt)}</span>
                </p>
              </div>
              <StatusBadge status={selectedShift.status} />
            </div>
          ) : (
            <div className="border-b border-border/50 px-4 py-2.5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Shift details
              </h3>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            <ShiftDetail
              shiftId={selectedShiftId}
              canUpdateOpening={canUpdateOpening}
              onOpeningUpdated={() => {
                setNotice("Opening count updated.");
                setDetailRefreshKey((n) => n + 1);
                void loadShifts(page, false);
              }}
            />
          </div>
        </section>
      </div>

      {/* ── Mobile: rows + detail below ────────────────────────── */}
      <div className="space-y-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              className={cn(dashboardInputClass(loading), "rounded-none pl-8 text-sm")}
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search shifts"
            />
          </div>
          {canOpen ? (
            <Button
              size="sm"
              type="button"
              className="shrink-0 rounded-none shadow-sm"
              onClick={() => setOpenModal(true)}
            >
              Open
            </Button>
          ) : null}
        </div>
        <div className="flex gap-1.5">
          <select
            className={cn(dashboardSelectClass(loading), "min-w-0 flex-1 rounded-none text-xs")}
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
            className={cn(dashboardSelectClass(loading), "min-w-0 flex-1 rounded-none text-xs")}
            value={branchFilter}
            disabled={isBranchLockedRole}
            onChange={(e) => setBranchFilter(e.target.value)}
            aria-label="Filter by branch"
          >
            {isBranchLockedRole ? null : (
              <option value="">All branches</option>
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
        <div className="space-y-1.5">
          {filteredShifts.map((s) => (
            <ShiftRow
              key={s.id}
              shift={s}
              isSelected={selectedShiftId === s.id}
              onSelect={() =>
                setSelectedShiftId(s.id === selectedShiftId ? null : s.id)
              }
              compact
            />
          ))}
          {filteredShifts.length === 0 && !loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {shifts.length === 0 ? "No shifts yet" : "No shifts match"}
            </p>
          ) : null}
        </div>
        {selectedShiftId ? (
          <div className={cn(CARD, "overflow-hidden")}>
            <div className="mb-1 flex items-center justify-between border-b border-border/50 px-3 py-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Shift details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedShiftId(null)}
                aria-label="Close shift details"
                className="p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <ShiftDetail
              shiftId={selectedShiftId}
              canUpdateOpening={canUpdateOpening}
              onOpeningUpdated={() => {
                setNotice("Opening count updated.");
                setDetailRefreshKey((n) => n + 1);
                void loadShifts(page, false);
              }}
            />
          </div>
        ) : null}
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
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
