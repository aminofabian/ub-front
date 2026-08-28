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
  fetchDrawerBalances,
  fetchShiftDetail,
  fetchShiftDrawouts,
  fetchShifts,
  fetchDrawout,
  fetchPendingDrawouts,
  type BranchRecord,
  type DenominationRecord,
  type DrawerBalanceRecord,
  type DrawerBalanceRowRecord,
  type DrawoutRecord,
  type ShiftListItem,
  type ShiftRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cashierMayRecordDrawout } from "@/lib/pos-cashier-capabilities";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/components/providers/tenant-provider";

import {
  KES_DENOMINATIONS,
  VARIANCE_THRESHOLD_RED,
  moneyStr,
  varianceColor,
  denomTotal,
  denomsToQuantities,
  OpenShiftModal,
  EditOpeningCountModal,
  CloseShiftModal,
  DrawoutModal,
  DRAWOUT_CATEGORIES,
} from "@/components/shifts/shift-action-modals";
import { DrawoutApprovalActions } from "@/components/shifts/drawout-approval-actions";
import {
  mktChip,
  mktChipActive,
  mktPosAccentBar,
  mktPosHeader,
  mktPosSearch,
  mktPosShell,
} from "@/app/marketplace/_components/marketplace-ui";

/* ═══════════════════════════════════════════════════════════════════════════
 * THE SHIFTS BOARD — direction contract (marketplace shelf grammar)
 *
 * THESIS: one till board arranged like the supplier marketplace shelf —
 *   passport header → search → chips → teal section bar → list rail + detail.
 *   Refuses the three-panel console and soft dashboard cards.
 *
 * OWN-WORLD: marketplace paper/ink/teal tokens (sharp corners, pos-primary
 *   rails, chip filters); ledger figures stay mono.
 *
 * STORY: the manager scans status chips, picks a shift from the board rail,
 *   and the detail shelf shows the cash story.
 *
 * FIRST VIEWPORT: title + Products-style status tabs; search; branch chips;
 *   teal "Board / Detail" bar; list + pane.
 *
 * FORM: marketplace shelf arrangement applied to shifts Operate task;
 *   inherits live palmart.co.ke/marketplace chrome.
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

/** Marketplace-style sharp paper panel. */
const CARD = mktPosShell;

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

function liveDrawoutTotals(drawouts: DrawoutRecord[]) {
  let approved = 0;
  let pending = 0;
  for (const d of drawouts) {
    const n = typeof d.amount === "number" ? d.amount : Number(d.amount);
    if (!Number.isFinite(n)) continue;
    if (d.status === "APPROVED") approved += n;
    else if (d.status === "PENDING_APPROVAL") pending += n;
  }
  return { approved, pending, live: approved + pending };
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
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium",
        className ?? "text-muted-foreground",
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
        "group relative w-full overflow-hidden border text-left transition-[border-color,background-color,box-shadow] duration-150",
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
        isSelected
          ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)] shadow-none"
          : "bg-[color-mix(in_srgb,var(--card)_88%,#f7f3eb)] hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_32%,transparent)] hover:bg-card hover:shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
        compact && "p-2.5",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1 transition-opacity duration-150",
          isSelected ? "bg-[var(--pos-primary-ink,#fff)]/35 opacity-100" : "opacity-0 group-hover:opacity-70",
          !isSelected && statusRailClass(shift.status),
        )}
        aria-hidden
      />

      <div className={cn("flex items-start justify-between gap-2", compact ? "" : "p-3")}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center border font-sans text-[11px] font-bold tracking-tight",
              isSelected
                ? "border-white/30 bg-white/15 text-[var(--pos-primary-ink,#fff)]"
                : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] text-[var(--pos-ink,#1c1915)]",
            )}
            aria-hidden
          >
            {initials(shift.cashierName)}
          </span>
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-sm font-semibold",
                isSelected ? "text-[var(--pos-primary-ink,#fff)]" : "text-[var(--pos-ink,#1c1915)]",
              )}
            >
              {shift.cashierName}
            </span>
            <span
              className={cn(
                "mt-0.5 flex items-center gap-1 truncate text-xs",
                isSelected
                  ? "text-[var(--pos-primary-ink,#fff)]/75"
                  : "text-muted-foreground",
              )}
            >
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{shift.branchName}</span>
            </span>
          </div>
        </div>
        {isSelected ? (
          <span className="inline-flex items-center border border-white/30 bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--pos-primary-ink,#fff)]">
            {statusLabel(shift.status)}
          </span>
        ) : (
          <StatusBadge status={shift.status} />
        )}
      </div>

      <div
        className={cn(
          "flex items-center gap-2 text-xs",
          compact ? "mt-2" : "mt-2.5 px-3",
        )}
      >
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1",
            isSelected
              ? "text-[var(--pos-primary-ink,#fff)]/75"
              : "text-muted-foreground",
          )}
        >
          <Clock className="size-3" aria-hidden />
          <span className={NUM}>{fmtShortDate(shift.openedAt)}</span>
        </span>
        <span
          className={cn("h-3 w-px", isSelected ? "bg-white/30" : "bg-border/70")}
          aria-hidden
        />
        <span
          className={cn(
            "inline-flex shrink-0 items-baseline gap-0.5",
            isSelected
              ? "text-[var(--pos-primary-ink,#fff)]/75"
              : "text-muted-foreground",
          )}
        >
          <span>Float</span>
          <span
            className={cn(
              "font-medium",
              NUM,
              isSelected
                ? "text-[var(--pos-primary-ink,#fff)]"
                : "text-foreground",
            )}
          >
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
                isSelected
                  ? "border-white/30 bg-white/15 text-[var(--pos-primary-ink,#fff)]"
                  : cn(
                      varianceBgColor(v),
                      needsReview && "text-red-700 dark:text-red-300",
                    ),
              )}
            >
              {needsReview && !isSelected ? (
                <AlertTriangle
                  className="size-3 text-red-600 dark:text-red-400"
                  aria-label="Needs review"
                />
              ) : null}
              {varNum >= 0 ? "+" : ""}
              {moneyStrCompact(v)}
            </span>
          </>
        ) : shift.status === "open" ? (
          <>
            <span className="ml-auto" aria-hidden />
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5",
                isSelected
                  ? "text-[var(--pos-primary-ink,#fff)]/70"
                  : "text-muted-foreground/50",
              )}
              aria-hidden
            />
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

/** Denomination comparison view (opening vs closing, plus ledger-expected when available). */
function DenominationComparison({
  openingDenoms,
  closingDenoms,
  expectedDenoms,
  expectedClosingCash,
  countedClosingCash,
  closingVariance,
}: {
  openingDenoms: DenominationRecord[];
  closingDenoms: DenominationRecord[];
  /** Expected ledger quantities (opening + movements) per denomination. */
  expectedDenoms?: DrawerBalanceRowRecord[];
  expectedClosingCash: number | string | null;
  countedClosingCash: number | string | null;
  closingVariance: number | string | null;
}) {
  const openQty = denomsToQuantities(openingDenoms);
  const closeQty = denomsToQuantities(closingDenoms);
  const expectedQty: Record<number, number> = {};
  if (expectedDenoms) {
    for (const row of expectedDenoms) {
      expectedQty[row.denomination] = row.quantity;
    }
  }
  const hasExpected = expectedDenoms != null && expectedDenoms.length > 0;
  const openTotal = denomTotal(openingDenoms);
  const closeTotal = denomTotal(closingDenoms);
  const expectedTotal = Object.entries(expectedQty).reduce(
    (sum, [denom, qty]) => sum + Number(denom) * qty,
    0,
  );
  const netChange = closeTotal - openTotal;
  const expected = toNum(expectedClosingCash);
  const counted = toNum(countedClosingCash);
  const variance = toNum(closingVariance);
  const showReconciliation = expected != null || counted != null || variance != null;

  const deltaColor = (v: number) =>
    v < 0
      ? "text-red-600 dark:text-red-400"
      : v > 0
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

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
                {hasExpected ? (
                  <th
                    scope="col"
                    title="Opening + ledger movements"
                    className="px-3 py-2 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
                  >
                    Expected
                    <span className="block text-[9px] font-normal normal-case tracking-normal text-muted-foreground/55">
                      qty · total
                    </span>
                  </th>
                ) : null}
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
                  title={
                    hasExpected
                      ? "Closing − Expected (per denomination)"
                      : "Net cash movement during the shift (Closing − Opening)"
                  }
                  className="px-3 py-2 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
                >
                  {hasExpected ? "Variance" : "Change"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {KES_DENOMINATIONS.map((d) => {
                const oQty = openQty[d.value] || 0;
                const eQty = expectedQty[d.value] || 0;
                const cQty = closeQty[d.value] || 0;
                const oTotal = d.value * oQty;
                const eTotal = d.value * eQty;
                const cTotal = d.value * cQty;
                const change = cTotal - oTotal;
                const deltaQty = hasExpected ? cQty - eQty : 0;
                const deltaMoney = hasExpected ? cTotal - eTotal : 0;
                const hasData = oQty > 0 || cQty > 0 || eQty !== 0;
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
                    {hasExpected ? (
                      <td className="whitespace-nowrap px-3 py-1.5 text-right sm:px-4">
                        <span className="font-mono tabular-nums text-muted-foreground">
                          {eQty}
                        </span>
                        <span className="mx-1 text-muted-foreground/40">·</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {moneyStr(eTotal)}
                        </span>
                      </td>
                    ) : null}
                    <td className="whitespace-nowrap px-3 py-1.5 text-right sm:px-4">
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {cQty}
                      </span>
                      <span className="mx-1 text-muted-foreground/40">·</span>
                      <span className="font-mono tabular-nums text-foreground">
                        {moneyStr(cTotal)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right sm:px-4">
                      {hasExpected ? (
                        <span className="inline-flex items-center justify-end gap-1.5">
                          {deltaQty !== 0 ? (
                            <span
                              className={cn(
                                "rounded px-1 py-px text-[10px] font-semibold tabular-nums",
                                deltaQty < 0
                                  ? "bg-red-500/15 text-red-700 dark:text-red-300"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                              )}
                            >
                              {deltaQty < 0 ? `Short ${-deltaQty}` : `Long ${deltaQty}`}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "font-medium font-mono tabular-nums",
                              deltaColor(deltaMoney),
                            )}
                          >
                            {signedMoney(deltaMoney)}
                          </span>
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "font-medium font-mono tabular-nums",
                            changeColor(change),
                          )}
                        >
                          {signedMoney(change)}
                        </span>
                      )}
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
                {hasExpected ? (
                  <td className="whitespace-nowrap px-3 py-2 text-right sm:px-4">
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {Object.values(expectedQty).reduce((a, b) => a + b, 0)}
                    </span>
                    <span className="mx-1 text-muted-foreground/40">·</span>
                    <span className="font-mono tabular-nums text-foreground">
                      {moneyStr(expectedTotal)}
                    </span>
                  </td>
                ) : null}
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
                    hasExpected ? deltaColor(closeTotal - expectedTotal) : changeColor(netChange),
                  )}
                >
                  {hasExpected ? signedMoney(closeTotal - expectedTotal) : signedMoney(netChange)}
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
            {hasExpected
              ? "Variance = Closing − Expected (opening + ledger movements). Short means notes/coins are missing; Long means they are in excess."
              : "Variance = Counted − Expected. The Change column above is Closing − Opening (cash movement), not variance."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Expected drawer (live ledger) ──────────────────────────────────────────

/** Read-only live view of the ledger-projected drawer for an open shift. */
function ExpectedDrawerCard({ balances }: { balances: DrawerBalanceRecord }) {
  return (
    <div className={cn(DASHBOARD_TABLE_SURFACE, "overflow-hidden")}>
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/25 px-3 py-2">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
          Expected drawer · live
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-px text-[10px] font-semibold",
            balances.consistent
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
          )}
        >
          {balances.consistent ? "Reconciled" : "Ledger drift"}
        </span>
      </div>
      <div className="divide-y divide-border/40">
        {KES_DENOMINATIONS.map((d) => {
          const row = balances.balances.find(
            (r) => r.denomination === d.value,
          );
          if (!row) return null;
          return (
            <div
              key={d.value}
              className="flex items-center justify-between px-3 py-1.5 text-xs"
            >
              <span className="font-medium text-foreground">{d.label}</span>
              <span className="font-mono tabular-nums text-foreground">
                {row.quantity}
                <span className="mx-1 text-muted-foreground/40">·</span>
                {moneyStr(row.total)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-3 py-2 text-xs font-semibold">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
          Total
        </span>
        <span className="font-mono tabular-nums text-foreground">
          {moneyStr(balances.ledgerTotal)}
        </span>
      </div>
    </div>
  );
}

// ─── Drawouts ──────────────────────────────────────────────────────────────

function DrawoutList({
  drawouts,
  canApprove,
  onChanged,
  highlightId,
}: {
  drawouts: DrawoutRecord[];
  canApprove?: boolean;
  onChanged?: () => void;
  highlightId?: string | null;
}) {
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
                  {canApprove ? (
                    <th
                      scope="col"
                      className="px-3 py-2.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-foreground/65 sm:px-4"
                    >
                      Action
                    </th>
                  ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {drawouts.map((d) => (
                <tr
                  key={d.id}
                  id={`drawout-${d.id}`}
                  className={cn(
                    "transition-colors hover:bg-muted/25",
                    d.status === "VOIDED" && "opacity-60",
                    highlightId === d.id && "bg-amber-50 dark:bg-amber-950/30",
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
                  {canApprove ? (
                    <td className="px-3 py-2 text-right sm:px-4">
                      <DrawoutApprovalActions
                        drawout={d}
                        onChanged={() => onChanged?.()}
                      />
                    </td>
                  ) : null}
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
  canApproveDrawouts,
  highlightDrawoutId,
  refreshKey,
  onOpeningUpdated,
  onDrawoutsChanged,
}: {
  shiftId: string | null;
  canUpdateOpening?: boolean;
  canApproveDrawouts?: boolean;
  highlightDrawoutId?: string | null;
  refreshKey?: number;
  onOpeningUpdated?: () => void;
  onDrawoutsChanged?: () => void;
}) {
  const [detail, setDetail] = useState<ShiftRecord | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [drawouts, setDrawouts] = useState<DrawoutRecord[]>([]);
  const [drawoutsLoading, setDrawoutsLoading] = useState(false);
  const [expectedBalances, setExpectedBalances] =
    useState<DrawerBalanceRecord | null>(null);
  const [editOpeningOpen, setEditOpeningOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!shiftId) {
      setDetail(null);
      setDrawouts([]);
      setExpectedBalances(null);
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

    // Expected per-denomination balances (ledger projection) for the counts tab.
    fetchDrawerBalances(shiftId)
      .then((b) => {
        if (!cancelled) setExpectedBalances(b);
      })
      .catch(() => {
        if (!cancelled) setExpectedBalances(null);
      });

    return () => {
      cancelled = true;
    };
  }, [shiftId, reloadToken, refreshKey]);

  useEffect(() => {
    if (highlightDrawoutId) {
      setActiveTab("drawouts");
    }
  }, [highlightDrawoutId, shiftId]);

  useEffect(() => {
    if (!highlightDrawoutId || drawoutsLoading) return;
    const el = document.getElementById(`drawout-${highlightDrawoutId}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightDrawoutId, drawoutsLoading, drawouts]);

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
  const drawoutTotals = liveDrawoutTotals(drawouts);
  const cashIn =
    opening != null && expected != null
      ? expected - opening + drawoutTotals.live
      : null;
  const cashMovement =
    opening != null && expected != null ? expected - opening : null;
  const showTillWalk = !drawoutsLoading && drawoutTotals.live > 0;
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
            {showTillWalk ? (
              <div className={cn(CARD, "space-y-2 p-3.5")}>
                <SectionLabel icon={HandCoins} text="Till walk" />
                <dl className="space-y-1.5 text-xs">
                  <LeaderRow
                    label="Opening float"
                    value={opening != null ? moneyStr(opening) : "—"}
                  />
                  <LeaderRow
                    label="Cash in"
                    value={cashIn != null ? signedMoney(cashIn) : "—"}
                    valueClassName={changeColor(cashIn)}
                  />
                  <LeaderRow
                    label={
                      drawoutTotals.pending > 0 && drawoutTotals.approved > 0
                        ? "Drawouts (incl. pending)"
                        : drawoutTotals.pending > 0
                          ? "Drawouts (pending)"
                          : "Drawouts"
                    }
                    value={signedMoney(-drawoutTotals.live)}
                    valueClassName="text-orange-700 dark:text-orange-400"
                  />
                  <LeaderRow
                    label="Expected cash"
                    value={expected != null ? moneyStr(expected) : "—"}
                    strong
                  />
                  {counted != null ? (
                    <LeaderRow
                      label="Counted cash"
                      value={moneyStr(counted)}
                    />
                  ) : null}
                  {variance != null ? (
                    <LeaderRow
                      label="Variance"
                      value={signedMoney(variance)}
                      valueClassName={varianceColor(variance)}
                      strong
                    />
                  ) : null}
                </dl>
                <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground">
                  Drawouts leave the till when they are recorded, including
                  amounts still waiting for approval.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("drawouts")}
                  className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                >
                  View drawouts
                </button>
              </div>
            ) : cashMovement != null ? (
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
            {isOpenShift &&
            expectedBalances &&
            expectedBalances.balances.length > 0 ? (
              <ExpectedDrawerCard balances={expectedBalances} />
            ) : openingDenoms.length > 0 ||
              closingDenoms.length > 0 ||
              (expectedBalances?.balances.length ?? 0) > 0 ? (
              <DenominationComparison
                openingDenoms={openingDenoms}
                closingDenoms={closingDenoms}
                expectedDenoms={expectedBalances?.balances ?? []}
                expectedClosingCash={detail.expectedClosingCash}
                countedClosingCash={detail.countedClosingCash}
                closingVariance={detail.closingVariance}
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
              <DrawoutList
                drawouts={drawouts}
                canApprove={canApproveDrawouts}
                highlightId={highlightDrawoutId}
                onChanged={() => {
                  setReloadToken((n) => n + 1);
                  onDrawoutsChanged?.();
                }}
              />
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
  const featureFlags = useFeatureFlags();
  const canOpen = hasPermission(me?.permissions, Permission.ShiftsOpen);
  const canClose = hasPermission(me?.permissions, Permission.ShiftsClose);
  const canRead = hasPermission(me?.permissions, Permission.ShiftsRead);
  const canUpdateOpening = hasPermission(
    me?.permissions,
    Permission.ShiftsUpdate,
  );
  const canApproveDrawouts = hasPermission(
    me?.permissions,
    Permission.ShiftsDrawoutsApprove,
  );
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const canRecordDrawout =
    canClose && cashierMayRecordDrawout(featureFlags, roleKey);
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
  const [highlightDrawoutId, setHighlightDrawoutId] = useState<string | null>(
    null,
  );
  const [pendingDrawouts, setPendingDrawouts] = useState<DrawoutRecord[]>([]);

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

    const pickBannerShift = async (branchIds: string[]) => {
      for (const bid of branchIds) {
        try {
          const s = await fetchCurrentShift(bid);
          if (s.status === "open") {
            return s;
          }
        } catch {
          // no till/branch-scoped open on this register
        }
      }
      if (isBranchLockedRole) {
        return null;
      }
      // Managers: surface any open shift on the branch (other tills).
      for (const bid of branchIds) {
        try {
          const listed = await fetchShifts({
            branchId: bid,
            status: "open",
            size: 20,
          });
          const first = listed.shifts.find((row) => row.status === "open");
          if (!first) continue;
          try {
            return await fetchShiftDetail(first.id);
          } catch {
            return {
              id: first.id,
              branchId: first.branchId,
              branchName: first.branchName,
              status: first.status,
              openingCash: first.openingFloat,
              expectedClosingCash: first.expectedCash,
              countedClosingCash: first.actualCountedCash,
              closingVariance: first.variance,
              openingNotes: null,
              closingNotes: null,
              varianceReason: null,
              openedBy: first.cashierId,
              openedByName: first.cashierName,
              closedBy: null,
              closedByName: null,
              openedAt: first.openedAt,
              closedAt: first.closedAt,
              closeJournalEntryId: null,
              tillLabel: first.registerName ?? null,
            } satisfies ShiftRecord;
          }
        } catch {
          // continue
        }
      }
      return null;
    };

    if (isBranchLockedRole) {
      const bid = me?.branchId?.trim();
      if (!bid || !branches.some((b) => b.id === bid)) {
        setCurrentOpenShift(null);
        return;
      }
      setCurrentOpenShift(await pickBannerShift([bid]));
      return;
    }

    setCurrentOpenShift(await pickBannerShift(branches.map((b) => b.id)));
  }, [branches, isBranchLockedRole, me?.branchId]);

  useEffect(() => {
    refreshOpenShift().catch(() => undefined);
  }, [refreshOpenShift]);

  useEffect(() => {
    if (!canApproveDrawouts) {
      setPendingDrawouts([]);
      return;
    }
    let cancelled = false;
    fetchPendingDrawouts()
      .then((list) => {
        if (!cancelled) setPendingDrawouts(list);
      })
      .catch(() => {
        if (!cancelled) setPendingDrawouts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canApproveDrawouts, detailRefreshKey]);

  useEffect(() => {
    const drawoutId = searchParams.get("drawout")?.trim();
    if (!drawoutId || !allowed) return;
    let cancelled = false;
    fetchDrawout(drawoutId)
      .then((row) => {
        if (cancelled) return;
        setSelectedShiftId(row.shiftId);
        setHighlightDrawoutId(row.id);
      })
      .catch(() => {
        if (cancelled || !canApproveDrawouts) return;
        fetchPendingDrawouts()
          .then((list) => {
            const found = list.find((row) => row.id === drawoutId);
            if (!found || cancelled) return;
            setSelectedShiftId(found.shiftId);
            setHighlightDrawoutId(found.id);
          })
          .catch(() => undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, canApproveDrawouts, searchParams]);

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
        } else if (action === "new-drawout" && canRecordDrawout) {
          setDrawoutModal(true);
        }
      } catch {
        setError("No open shift for that register.");
      } finally {
        clearQuery();
      }
    })();
  }, [allowed, searchParams, canOpen, canClose, canRecordDrawout, router, isBranchLockedRole, me?.branchId]);

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
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1400px] flex-col gap-2 px-2 pb-10 sm:px-5 sm:pb-12">
      {/* Passport trail — same grammar as marketplace */}
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-0.5 pt-1">
        <p className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
          shifts
          <span className="font-sans text-muted-foreground/80">
            {" "}
            · branch → board → count
          </span>
        </p>
        {quickLinks.length > 0 ? (
          <nav aria-label="Related pages" className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {quickLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-[var(--pos-ink,#1c1915)] hover:underline"
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      {(notice || error || (canApproveDrawouts && pendingDrawouts.length > 0)) ? (
        <div className="flex flex-col gap-2">
          {notice ? <DashboardFeedback kind="success" text={notice} /> : null}
          {error ? <DashboardFeedback kind="error" text={error} /> : null}
          {canApproveDrawouts && pendingDrawouts.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border border-amber-700/20 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-400/25 dark:bg-amber-950/35 dark:text-amber-100">
              <p>
                {pendingDrawouts.length === 1
                  ? "1 drawout is waiting for your approval."
                  : `${pendingDrawouts.length} drawouts are waiting for your approval.`}{" "}
                They are already deducted from the expected till.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-none"
                onClick={() => {
                  const first = pendingDrawouts[0];
                  if (!first) return;
                  setSelectedShiftId(first.shiftId);
                  setHighlightDrawoutId(first.id);
                }}
              >
                Review
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Live open shift — teal strip like marketplace section bars */}
      {currentOpenShift ? (
        <section
          aria-label="Open shift"
          className={cn(
            "relative flex flex-wrap items-center gap-x-4 gap-y-2 overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
            "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,var(--card))] px-3 py-2.5 sm:px-4",
          )}
        >
          <span
            className="absolute inset-y-0 left-0 w-1 bg-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          <span className="relative flex items-center gap-2.5 pl-1">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--pos-primary,#0f766e)] opacity-60" aria-hidden />
              <span className="relative inline-flex size-2.5 rounded-full bg-[var(--pos-primary,#0f766e)]" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-[var(--pos-ink,#1c1915)]">
              {currentOpenShift.openedByName || "Cashier"}
              <span className="font-normal text-muted-foreground"> at </span>
              {currentOpenShift.tillLabel || currentOpenShift.branchName}
            </p>
          </span>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            Since <span className={NUM}>{fmtShortDate(currentOpenShift.openedAt)}</span>
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wallet className="size-3.5" aria-hidden />
            Float{" "}
            <span className={cn("font-semibold text-[var(--pos-ink,#1c1915)]", NUM)}>
              {moneyStr(currentOpenShift.openingCash)}
            </span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            {canRecordDrawout ? (
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
            ) : canClose ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="rounded-none"
                onClick={() => setCloseModal(true)}
              >
                Close shift
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Marketplace-style POS shell: header → search → chips → board */}
      <div
        className={cn(
          mktPosShell,
          "relative flex min-h-0 flex-1 flex-col",
          "min-h-[min(82dvh,52rem)]",
        )}
      >
        {/* Passport identity + search strip */}
        <section className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2.5 py-2 sm:px-3">
          <span aria-hidden className={mktPosAccentBar} />
          <div className="space-y-2 pl-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-[15px] font-semibold leading-tight text-[var(--pos-ink,#1c1915)] sm:text-base">
                  {branchFilter
                    ? branches.find((b) => b.id === branchFilter)?.name ?? "Shifts"
                    : "All shifts"}
                </h1>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {loading
                    ? "Loading…"
                    : `${filteredShifts.length} shift${filteredShifts.length === 1 ? "" : "s"}`}
                  {statusFilter
                    ? ` · ${STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter}`
                    : ""}
                  {totalCount > filteredShifts.length
                    ? ` · ${totalCount} total`
                    : ""}
                </p>
                <ActiveScopeSubtitle className="mt-0.5 text-[11px]" />
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {canOpen ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-none px-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
                    onClick={() => setOpenModal(true)}
                  >
                    Open shift
                  </Button>
                ) : null}
                {currentOpenShift && canRecordDrawout ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-none px-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
                    onClick={() => setDrawoutModal(true)}
                  >
                    Drawout
                  </Button>
                ) : null}
                <div
                  role="tablist"
                  aria-label="Shift status"
                  className="flex rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)]"
                >
                  {STATUS_OPTIONS.filter((o) =>
                    ["", "open", "closed", "reconciled"].includes(o.value),
                  ).map((opt) => {
                    const active = statusFilter === opt.value;
                    return (
                      <button
                        key={opt.value || "all"}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={cn(
                          "inline-flex h-8 items-center rounded-none px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition sm:px-3",
                          active
                            ? "bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]"
                            : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] hover:text-[var(--pos-ink,#1c1915)]",
                        )}
                        onClick={() => setStatusFilter(opt.value)}
                      >
                        {opt.value === "" ? "All" : opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="relative rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-[color-mix(in_srgb,#fff_82%,transparent)]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className={mktPosSearch}
                placeholder="Find a cashier or branch…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search shifts"
              />
              {search ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-[var(--pos-ink,#1c1915)]"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            {/* Branch chips — marketplace Area row */}
            {!isBranchLockedRole && branches.length > 0 ? (
              <div className="flex flex-col gap-1.5 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] pt-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    1 · Branch
                  </span>
                  <button
                    type="button"
                    className={cn(mktChip, !branchFilter && mktChipActive)}
                    onClick={() => setBranchFilter("")}
                  >
                    All
                  </button>
                  {branches
                    .filter((b) => b.active !== false)
                    .map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className={cn(
                          mktChip,
                          branchFilter === b.id && mktChipActive,
                        )}
                        onClick={() =>
                          setBranchFilter((cur) => (cur === b.id ? "" : b.id))
                        }
                      >
                        {b.name}
                      </button>
                    ))}
                </div>
                {statusFilter === "suspended" ? null : (
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Status
                    </span>
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value || "all-status"}
                        type="button"
                        className={cn(
                          mktChip,
                          statusFilter === opt.value && mktChipActive,
                        )}
                        onClick={() => setStatusFilter(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] pt-2 pb-0.5">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Status
                </span>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value || "all-status"}
                    type="button"
                    className={cn(
                      mktChip,
                      statusFilter === opt.value && mktChipActive,
                    )}
                    onClick={() => setStatusFilter(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Teal section bar — marketplace "2 · Supplier | Shelf" */}
        <div className={cn(mktPosHeader, "gap-2")}>
          <span className="flex min-w-0 items-center gap-2">
            <span>2 · Board</span>
            <span className="font-mono font-normal tabular-nums opacity-80">
              {filteredShifts.length}
            </span>
          </span>
          <span className="hidden min-w-0 truncate font-sans text-[11px] font-semibold normal-case tracking-normal opacity-95 sm:inline">
            {selectedShift
              ? `${selectedShift.cashierName} · ${selectedShift.branchName}`
              : "Select a shift"}
          </span>
          <VarianceLegend className="ml-auto hidden text-[var(--pos-primary-ink,#fff)]/85 sm:flex" />
        </div>

        {/* Board: list rail + detail shelf */}
        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <section
            aria-label="Shift board"
            className="flex min-h-0 flex-col border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] md:border-r"
          >
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {filteredShifts.map((s) => (
                <ShiftRow
                  key={s.id}
                  shift={s}
                  isSelected={selectedShiftId === s.id}
                  onSelect={() =>
                    setSelectedShiftId((cur) =>
                      cur === s.id && typeof window !== "undefined" &&
                      window.matchMedia("(max-width: 767px)").matches
                        ? null
                        : s.id,
                    )
                  }
                />
              ))}
              {filteredShifts.length === 0 && !loading ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Search className="size-5 text-muted-foreground/50" aria-hidden />
                  <p className="text-sm font-medium text-[var(--pos-ink,#1c1915)]">
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

          <section
            aria-label="Shift details"
            className="hidden min-h-0 flex-col overflow-hidden md:flex"
          >
            {selectedShift ? (
              <div className="flex items-center gap-3 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-4 py-2.5">
                <span
                  className="flex size-9 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] font-sans text-[11px] font-bold tracking-tight text-[var(--pos-ink,#1c1915)]"
                  aria-hidden
                >
                  {initials(selectedShift.cashierName)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold leading-tight tracking-tight text-[var(--pos-ink,#1c1915)]">
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
              <div className="border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-4 py-2.5">
                <h3 className="text-sm font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
                  Shift details
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Pick a shift from the board
                </p>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-hidden">
              <ShiftDetail
                shiftId={selectedShiftId}
                canUpdateOpening={canUpdateOpening}
                canApproveDrawouts={canApproveDrawouts}
                highlightDrawoutId={highlightDrawoutId}
                refreshKey={detailRefreshKey}
                onDrawoutsChanged={() => {
                  setDetailRefreshKey((n) => n + 1);
                  void refreshOpenShift();
                  void loadShifts(page, false);
                }}
                onOpeningUpdated={() => {
                  setNotice("Opening count updated.");
                  setDetailRefreshKey((n) => n + 1);
                  void loadShifts(page, false);
                }}
              />
            </div>
          </section>
        </div>
      </div>

      {/* Mobile detail sheet */}
      <div className="space-y-3 md:hidden">
        {selectedShiftId ? (
          <div className={cn(CARD, "overflow-hidden")}>
            <div className={mktPosHeader}>
              <span>Detail</span>
              <button
                type="button"
                onClick={() => setSelectedShiftId(null)}
                aria-label="Close shift details"
                className="p-0.5 text-[var(--pos-primary-ink,#fff)]/90 hover:text-[var(--pos-primary-ink,#fff)]"
              >
                <X className="size-4" />
              </button>
            </div>
            <ShiftDetail
              shiftId={selectedShiftId}
              canUpdateOpening={canUpdateOpening}
              canApproveDrawouts={canApproveDrawouts}
              highlightDrawoutId={highlightDrawoutId}
              refreshKey={detailRefreshKey}
              onDrawoutsChanged={() => {
                setDetailRefreshKey((n) => n + 1);
                void refreshOpenShift();
                void loadShifts(page, false);
              }}
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
            setNotice(
              "Drawout recorded. It is already deducted from the expected till.",
            );
            setDrawoutModal(false);
            setDetailRefreshKey((n) => n + 1);
            void refreshOpenShift();
            void loadShifts(page, false);
          }}
        />
      )}
    </div>
  );
}
