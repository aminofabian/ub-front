"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import type {
  BranchRecord,
  DailyAuditReviewLineRecord,
  DailyAuditReviewRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type LineFilter = "all" | "pending" | "mismatch" | "approved" | "escalated";

export function reviewLinePending(line: DailyAuditReviewLineRecord): boolean {
  return line.reviewStatus !== "approved" && line.reviewStatus !== "escalated";
}

export function reviewStatusLabel(status: string): string {
  if (status === "approved") return "Approved";
  if (status === "escalated") return "Escalated";
  return "Pending";
}

export function reviewNum(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n.toLocaleString() : String(v);
}

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function lineStatusBadgeClass(line: DailyAuditReviewLineRecord): string {
  const approved = line.reviewStatus === "approved";
  const escalated = line.reviewStatus === "escalated";
  if (approved) {
    return "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[var(--pos-primary,#0f766e)] text-white";
  }
  if (escalated) {
    return "border-[#9a2e16]/35 bg-transparent text-[#9a2e16]";
  }
  if (!line.matches) {
    return "border-[#9a2e16]/35 bg-transparent text-[#9a2e16]";
  }
  return "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground";
}

function lineRowTone(line: DailyAuditReviewLineRecord, selected: boolean): string {
  const approved = line.reviewStatus === "approved";
  const escalated = line.reviewStatus === "escalated";
  return cn(
    "w-full text-left transition-colors",
    selected
      ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
      : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
    approved && !selected
      ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,white)]"
      : null,
    escalated && !selected
      ? "bg-[color-mix(in_srgb,#9a2e16_4%,white)]"
      : null,
  );
}

function DailyAuditReviewBanner({
  review,
  matched,
  mismatched,
  approvedCount,
  pendingCount,
  branchName,
  auditDate,
}: {
  review: DailyAuditReviewRecord | null;
  matched: number;
  mismatched: number;
  approvedCount: number;
  pendingCount: number;
  branchName: string;
  auditDate: string;
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
          {review ? `${review.itemCount} items` : "Daily audit review"}
        </span>
        {review ? (
          <>
            <span className={dashboardHintClass()}>
              {branchName} · {auditDate}
            </span>
            <span className={dashboardHintClass()}>
              {matched} match{matched === 1 ? "" : "es"} · {mismatched} mismatch
              {mismatched === 1 ? "" : "es"}
            </span>
            <span className={dashboardHintClass()}>
              {approvedCount} approved · {pendingCount} pending
            </span>
          </>
        ) : (
          <span className={dashboardHintClass()}>
            Pick a branch and date, then refresh to load counts.
          </span>
        )}
      </p>
      <span className={cn(dashboardHintClass(), "hidden sm:inline")}>
        Approving sets inventory to the evening count.
      </span>
    </div>
  );
}

function AuditPulse({
  review,
  matched,
  mismatched,
  approvedCount,
  pendingLines,
  onSelect,
  className,
}: {
  review: DailyAuditReviewRecord;
  matched: number;
  mismatched: number;
  approvedCount: number;
  pendingLines: DailyAuditReviewLineRecord[];
  onSelect: (line: DailyAuditReviewLineRecord) => void;
  className?: string;
}) {
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  const attention = pendingLines.filter((l) => !l.matches).slice(0, 5);

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

      <div className={cn(card, "left-3 top-3")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Audit snapshot
        </p>
        <p
          className="mt-1 text-[1.65rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {review.itemCount}
        </p>
        <p className={cn(dashboardHintClass(), "mt-1")}>
          lines counted for this session
        </p>
      </div>

      <div className={cn(card, "right-3 top-[38%]")}>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div>
            <p className={dashboardHintClass()}>Matches</p>
            <p className="text-lg font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
              {matched}
            </p>
          </div>
          <div>
            <p className={dashboardHintClass()}>Mismatches</p>
            <p className="text-lg font-semibold tabular-nums text-[#9a2e16]">
              {mismatched}
            </p>
          </div>
          <div>
            <p className={dashboardHintClass()}>Approved</p>
            <p className="text-lg font-semibold tabular-nums">{approvedCount}</p>
          </div>
          <div>
            <p className={dashboardHintClass()}>Pending</p>
            <p className="text-lg font-semibold tabular-nums">
              {pendingLines.length}
            </p>
          </div>
        </div>
      </div>

      {attention.length > 0 ? (
        <div className={cn(card, "bottom-3 left-3 max-h-[40%] overflow-y-auto")}>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a2e16]">
            <AlertTriangle className="size-3.5" aria-hidden />
            Needs review
          </p>
          <ul className="mt-2 space-y-1">
            {attention.map((line) => (
              <li key={line.itemId}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 py-1 text-left text-[12px] font-medium hover:underline"
                  onClick={() => onSelect(line)}
                >
                  <span className="min-w-0 truncate">{line.itemName}</span>
                  <span className="shrink-0 tabular-nums text-[#9a2e16]">
                    Δ {reviewNum(line.variance)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AuditFocus({
  line,
  className,
}: {
  line: DailyAuditReviewLineRecord;
  className?: string;
}) {
  const approved = line.reviewStatus === "approved";
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center gap-4 px-4 py-6",
        className,
      )}
    >
      <div className="relative size-[min(12rem,42vw)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white">
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={line.itemName}
            fill
            className="object-contain p-3"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
            No photo
          </div>
        )}
        {approved ? (
          <div className="absolute inset-x-0 bottom-0 bg-[var(--pos-primary,#0f766e)] py-1 text-center text-[10px] font-semibold tracking-[-0.02em] text-white">
            Stock updated
          </div>
        ) : null}
      </div>
      <div className="max-w-md text-center">
        <h3
          className="text-[1.35rem] font-semibold leading-tight tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {line.itemName}
        </h3>
        <p className={cn(dashboardHintClass(), "mt-1")}>
          {[line.itemSku, line.categoryName, line.unitType]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2 text-[12px]">
          {(
            [
              ["Morning", line.morningCount],
              ["Evening", line.eveningCount],
              ["System", line.systemStock],
              ["Variance", line.variance],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white px-2 py-2"
            >
              <p className={dashboardHintClass()}>{label}</p>
              <p
                className={cn(
                  "font-semibold tabular-nums",
                  label === "Variance" && !line.matches
                    ? "text-[#9a2e16]"
                    : label === "Variance"
                      ? "text-[var(--pos-primary,#0f766e)]"
                      : null,
                )}
              >
                {reviewNum(value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LineDetailPanel({
  line,
  adminNotes,
  onAdminNotesChange,
  busy,
  actionItemId,
  onApprove,
  onEscalate,
}: {
  line: DailyAuditReviewLineRecord;
  adminNotes: string;
  onAdminNotesChange: (value: string) => void;
  busy: boolean;
  actionItemId: string | null;
  onApprove: () => void;
  onEscalate: () => void;
}) {
  const approved = line.reviewStatus === "approved";
  const escalated = line.reviewStatus === "escalated";
  const pending = reviewLinePending(line);
  const rowBusy = actionItemId === line.itemId;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Review
      </p>
      <h3 className="mt-1 text-[15px] font-semibold leading-snug tracking-[-0.02em]">
        {line.itemName}
      </h3>
      <span
        className={cn(
          "mt-2 inline-flex w-fit items-center gap-1 rounded-none border px-2 py-0.5 text-[10px] font-semibold capitalize",
          lineStatusBadgeClass(line),
        )}
      >
        {approved ? <CheckCircle2 className="size-3" aria-hidden /> : null}
        {reviewStatusLabel(line.reviewStatus)}
      </span>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
        {(
          [
            ["Morning", line.morningCount],
            ["Evening", line.eveningCount],
            ["System", line.systemStock],
            ["Variance", line.variance],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <p className={dashboardHintClass()}>{label}</p>
            <p
              className={cn(
                "font-medium tabular-nums",
                label === "Variance" && !line.matches
                  ? "text-[#9a2e16]"
                  : null,
              )}
            >
              {reviewNum(value)}
            </p>
          </div>
        ))}
      </div>

      {approved ? (
        <p className="mt-3 text-[11px] text-[var(--pos-primary,#0f766e)]">
          Inventory set to evening count
          {line.eveningCount != null
            ? ` (${reviewNum(line.eveningCount)})`
            : line.morningCount != null
              ? ` (${reviewNum(line.morningCount)})`
              : ""}
          {line.reviewedAt
            ? ` · ${new Date(line.reviewedAt).toLocaleString()}`
            : ""}
        </p>
      ) : null}

      {pending || escalated ? (
        <label className="mt-4 grid gap-1 text-[12px]">
          <span className={dashboardHintClass()}>Admin notes</span>
          <textarea
            className={cn(dashboardInputClass(), "min-h-[72px] text-[13px]")}
            placeholder="Optional notes for this line"
            value={adminNotes}
            onChange={(e) => onAdminNotesChange(e.target.value)}
            disabled={approved || busy}
          />
        </label>
      ) : line.reviewNotes ? (
        <p className={cn(dashboardHintClass(), "mt-4")}>
          Notes: {line.reviewNotes}
        </p>
      ) : null}

      {pending ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="h-8 rounded-none shadow-none"
            disabled={busy}
            onClick={onApprove}
          >
            {rowBusy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <>
                <CheckCircle2 className="mr-1 size-4" aria-hidden />
                Approve & update stock
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 rounded-none shadow-none"
            disabled={busy}
            onClick={onEscalate}
          >
            Escalate
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export type DailyAuditReviewTheatreProps = {
  branches: BranchRecord[];
  branchId: string;
  onBranchIdChange: (value: string) => void;
  branchLocked: boolean;
  date: string;
  onDateChange: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
  review: DailyAuditReviewRecord | null;
  matched: number;
  mismatched: number;
  approvedCount: number;
  pendingLines: DailyAuditReviewLineRecord[];
  selectedItemId: string | null;
  selectedLine: DailyAuditReviewLineRecord | null;
  onSelectLine: (line: DailyAuditReviewLineRecord) => void;
  onClearSelection: () => void;
  mobileShowDetail: boolean;
  selectedIds: Set<string>;
  onToggleSelected: (itemId: string) => void;
  allPendingSelected: boolean;
  onToggleSelectAllPending: () => void;
  adminNotes: Record<string, string>;
  onAdminNotesChange: (itemId: string, value: string) => void;
  busy: boolean;
  actionItemId: string | null;
  onApproveLine: (line: DailyAuditReviewLineRecord) => void;
  onEscalateLine: (line: DailyAuditReviewLineRecord) => void;
  bulkBusy: boolean;
  onBulkApprove: () => void;
  onClearBulkSelection: () => void;
  alerts?: ReactNode;
};

export function DailyAuditReviewTheatre(props: DailyAuditReviewTheatreProps) {
  const {
    branches,
    branchId,
    onBranchIdChange,
    branchLocked,
    date,
    onDateChange,
    onRefresh,
    loading,
    review,
    matched,
    mismatched,
    approvedCount,
    pendingLines,
    selectedItemId,
    selectedLine,
    onSelectLine,
    onClearSelection,
    mobileShowDetail,
    selectedIds,
    onToggleSelected,
    allPendingSelected,
    onToggleSelectAllPending,
    adminNotes,
    onAdminNotesChange,
    busy,
    actionItemId,
    onApproveLine,
    onEscalateLine,
    bulkBusy,
    onBulkApprove,
    onClearBulkSelection,
    alerts,
  } = props;

  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [lineFilter, setLineFilter] = useState<LineFilter>("all");

  const branchName =
    branches.find((b) => b.id === branchId)?.name ?? "Branch";

  const lines = review?.lines ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lines.filter((line) => {
      const matchesQuery =
        !q ||
        line.itemName.toLowerCase().includes(q) ||
        (line.itemSku?.toLowerCase().includes(q) ?? false) ||
        (line.barcode?.toLowerCase().includes(q) ?? false) ||
        (line.categoryName?.toLowerCase().includes(q) ?? false);

      const matchesFilter =
        lineFilter === "all" ||
        (lineFilter === "pending" && reviewLinePending(line)) ||
        (lineFilter === "mismatch" && !line.matches) ||
        (lineFilter === "approved" && line.reviewStatus === "approved") ||
        (lineFilter === "escalated" && line.reviewStatus === "escalated");

      return matchesQuery && matchesFilter;
    });
  }, [lines, query, lineFilter]);

  const filterCounts = useMemo(
    () => ({
      all: lines.length,
      pending: lines.filter(reviewLinePending).length,
      mismatch: lines.filter((l) => !l.matches).length,
      approved: lines.filter((l) => l.reviewStatus === "approved").length,
      escalated: lines.filter((l) => l.reviewStatus === "escalated").length,
    }),
    [lines],
  );

  const mobileDetailOpen = mobileShowDetail && !!selectedLine;

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
          <div className="grid gap-2">
            <label className="grid gap-0.5 text-[11px]">
              <span className={dashboardHintClass()}>Branch</span>
              <select
                className={cn(
                  dashboardSelectClass(branchLocked),
                  denser ? "h-8 py-0 text-[11px]" : "h-9 text-[12px]",
                )}
                value={branchId}
                onChange={(e) => onBranchIdChange(e.target.value)}
                disabled={branchLocked}
              >
                <option value="">Select branch</option>
                {branches
                  .filter((b) => !branchLocked || b.id === branchId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="grid gap-0.5 text-[11px]">
              <span className={dashboardHintClass()}>Audit date</span>
              <input
                type="date"
                className={cn(
                  dashboardInputClass(),
                  denser ? "h-8 text-[11px]" : "h-9 text-[12px]",
                )}
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full rounded-none shadow-none"
              onClick={onRefresh}
              disabled={loading || !branchId}
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden />
              )}
              Refresh
            </Button>
          </div>

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
              placeholder="Name, SKU, barcode…"
              aria-label="Search audit lines"
              disabled={!review}
            />
          </label>

          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "All", filterCounts.all],
                ["pending", "Pending", filterCounts.pending],
                ["mismatch", "Mismatch", filterCounts.mismatch],
                ["approved", "OK", filterCounts.approved],
                ["escalated", "Escalated", filterCounts.escalated],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                aria-pressed={lineFilter === id}
                disabled={!review}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-none border px-1.5 text-[10px] font-semibold disabled:opacity-50",
                  lineFilter === id
                    ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                )}
                onClick={() => setLineFilter(id)}
              >
                {label}
                <span className="tabular-nums opacity-80">{count}</span>
              </button>
            ))}
          </div>

          {review && pendingLines.length > 0 ? (
            <label className="inline-flex cursor-pointer items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                className="size-3.5 accent-[var(--pos-primary,#0f766e)]"
                checked={allPendingSelected}
                onChange={onToggleSelectAllPending}
                disabled={busy}
              />
              <span>Select all pending ({pendingLines.length})</span>
            </label>
          ) : null}

          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filtered.length}
            {query.trim() || lineFilter !== "all"
              ? ` of ${lines.length}`
              : ""}{" "}
            {filtered.length === 1 ? "item" : "items"}
          </p>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {loading ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-hidden />
            </div>
          ) : !review ? (
            <div className="px-3 py-10 text-center">
              <ShieldAlert
                className="mx-auto size-7 text-muted-foreground/60"
                aria-hidden
              />
              <p className="mt-2 text-[14px] font-semibold text-foreground">
                No audit loaded
              </p>
              <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem]")}>
                Choose branch and date, then refresh.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              {query.trim()
                ? `No items match “${query.trim()}”.`
                : "No items match this filter."}
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filtered.map((line) => {
                const active = selectedItemId === line.itemId;
                const pending = reviewLinePending(line);
                const bulkSelected = selectedIds.has(line.itemId);
                return (
                  <li key={line.itemId} className="flex min-w-0">
                    {pending ? (
                      <label className="flex shrink-0 items-start px-2 pt-3">
                        <input
                          type="checkbox"
                          className="size-3.5 accent-[var(--pos-primary,#0f766e)]"
                          checked={bulkSelected}
                          onChange={() => onToggleSelected(line.itemId)}
                          disabled={busy}
                          aria-label={`Select ${line.itemName}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </label>
                    ) : (
                      <div className="flex w-7 shrink-0 items-start justify-center px-1 pt-3">
                        {line.reviewStatus === "approved" ? (
                          <ShieldCheck
                            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
                            aria-hidden
                          />
                        ) : null}
                      </div>
                    )}
                    <button
                      type="button"
                      className={cn(
                        "flex min-w-0 flex-1 items-start gap-2 px-2 py-2.5 sm:pr-3",
                        lineRowTone(line, active),
                      )}
                      onClick={() => onSelectLine(line)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold leading-snug">
                          {line.itemName}
                        </p>
                        <p className={cn(dashboardHintClass(), "truncate")}>
                          {[line.itemSku, line.categoryName]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex rounded-none border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
                              lineStatusBadgeClass(line),
                            )}
                          >
                            {reviewStatusLabel(line.reviewStatus)}
                          </span>
                          <span className={cn(dashboardHintClass(), "tabular-nums")}>
                            Eve {reviewNum(line.eveningCount)} · Sys{" "}
                            {reviewNum(line.systemStock)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          "mt-0.5 size-4 shrink-0 text-muted-foreground/50",
                          active && "text-[var(--pos-primary,#0f766e)]",
                        )}
                        aria-hidden
                      />
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
    review && selectedLine ? (
      <AuditFocus line={selectedLine} className="h-full min-h-0" />
    ) : review ? (
      <AuditPulse
        review={review}
        matched={matched}
        mismatched={mismatched}
        approvedCount={approvedCount}
        pendingLines={pendingLines}
        onSelect={onSelectLine}
        className="h-full min-h-0"
      />
    ) : (
      <div className="flex h-full items-center justify-center px-4">
        <p className={cn(dashboardHintClass(), "max-w-xs text-center")}>
          Load an audit to see progress and mismatches in the middle panel.
        </p>
      </div>
    );

  const notesForSelected =
    selectedLine != null
      ? (adminNotes[selectedLine.itemId] ?? selectedLine.reviewNotes ?? "")
      : "";

  const inspect = selectedLine ? (
    <LineDetailPanel
      line={selectedLine}
      adminNotes={notesForSelected}
      onAdminNotesChange={(value) =>
        onAdminNotesChange(selectedLine.itemId, value)
      }
      busy={busy}
      actionItemId={actionItemId}
      onApprove={() => onApproveLine(selectedLine)}
      onEscalate={() => onEscalateLine(selectedLine)}
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
          Pick a line
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          The map in the middle is audit progress. The list on the left names each
          counted item — select one to approve, escalate, or add notes.
        </p>
      </div>
      {selectedIds.size > 0 ? (
        <div className="space-y-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-4">
          <p className="text-[12px] font-semibold">
            {selectedIds.size} selected for bulk approve
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-none shadow-none"
              disabled={busy}
              onClick={onClearBulkSelection}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-none shadow-none"
              disabled={busy}
              onClick={onBulkApprove}
            >
              {bulkBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <>
                  <CheckCircle2 className="mr-1 size-4" aria-hidden />
                  Approve selected
                </>
              )}
            </Button>
          </div>
        </div>
      ) : mismatched > 0 && review ? (
        <p
          className={cn(
            dashboardHintClass(),
            "flex items-center gap-1.5 text-[#9a2e16]",
          )}
        >
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          {mismatched} mismatch{mismatched === 1 ? "" : "es"} still open
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <DailyAuditReviewBanner
        review={review}
        matched={matched}
        mismatched={mismatched}
        approvedCount={approvedCount}
        pendingCount={pendingLines.length}
        branchName={branchName}
        auditDate={review?.auditDate ?? date}
      />

      {alerts}

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
            The audit
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && selectedLine ? null : inspect}
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
        contextLabel="Audit line"
        title={selectedLine?.itemName ?? "Item"}
        description={
          selectedLine
            ? [
                selectedLine.itemSku,
                reviewStatusLabel(selectedLine.reviewStatus),
              ]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
      >
        {selectedLine ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-hidden bg-white",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            <LineDetailPanel
              line={selectedLine}
              adminNotes={notesForSelected}
              onAdminNotesChange={(value) =>
                onAdminNotesChange(selectedLine.itemId, value)
              }
              busy={busy}
              actionItemId={actionItemId}
              onApprove={() => onApproveLine(selectedLine)}
              onEscalate={() => onEscalateLine(selectedLine)}
            />
          </div>
        ) : null}
      </FormDrawer>

      {selectedIds.size > 0 && !isLg ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-medium">{selectedIds.size}</span> item
              {selectedIds.size === 1 ? "" : "s"} selected
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-none shadow-none"
                disabled={busy}
                onClick={onClearBulkSelection}
              >
                Clear
              </Button>
              <Button
                size="sm"
                className="rounded-none shadow-none"
                disabled={busy}
                onClick={onBulkApprove}
              >
                {bulkBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <>
                    <CheckCircle2 className="mr-1 size-4" aria-hidden />
                    Approve selected
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
