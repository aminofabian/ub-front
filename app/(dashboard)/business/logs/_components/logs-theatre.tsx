"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  ScrollText,
  Search,
} from "lucide-react";

import {
  dashboardFilterFieldLabelClass,
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
  DashboardLoadError,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { OpsClientLogsPanel } from "@/components/ops-client-logs-panel";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
import type {
  AuditEventCategory,
  AuditEventRecord,
  AuditEventSeverity,
  AuditEventSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const PAGE_SIZE = 50;

export const CATEGORY_LABELS: Record<AuditEventCategory, string> = {
  SECURITY: "Security",
  STAFF: "Staff",
  SALES: "Sales",
  CASH_DRAWER: "Cash drawer",
  INVENTORY: "Inventory",
  ORDERS: "Orders",
  CUSTOMERS: "Customers",
  PRODUCTS: "Products",
  SUPPLIERS: "Suppliers",
  SYSTEM: "System",
  FINANCE: "Finance",
};

export const CATEGORY_OPTIONS = Object.keys(
  CATEGORY_LABELS,
) as AuditEventCategory[];

export const SEVERITIES: AuditEventSeverity[] = [
  "DEBUG",
  "INFO",
  "WARN",
  "ERROR",
  "CRITICAL",
];

const SEVERITY_BADGE: Record<AuditEventSeverity, string> = {
  DEBUG:
    "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground",
  INFO: "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-[var(--order-ink,#15231f)]",
  WARN: "border-[#9a2e16]/35 bg-transparent text-[#9a2e16]",
  ERROR:
    "border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_8%,white)] text-[#9a2e16]",
  CRITICAL: "border-[#9a2e16]/50 bg-[#9a2e16] text-white",
};

/** Event types the backend can emit as failures/issues — quick filter help. */
export const KNOWN_FAILURE_EVENT_TYPES = [
  "login.failed",
  "session.tenant_mismatch",
  "session.access_denied",
  "permission.denied",
  "account.locked.soft",
  "account.locked.hard",
  "api_key.invalid",
  "stk_push.failed",
  "order.payment_failed",
  "webhook.failed",
  "scheduler.failed",
  "import_job.failed",
  "backup.failed",
  "system.exception",
  "drawout.rejected",
] as const;

const EVENT_TOKEN_OVERRIDES: Record<string, string> = {
  STK: "STK",
  POS: "POS",
  API: "API",
  PIN: "PIN",
  ID: "ID",
  MPESA: "M-Pesa",
  SOKOMIND: "SokoMind",
};

export type LogsPreset = "today" | "24h" | "7d" | "30d" | "custom";

export type LogsDraftFilters = {
  failuresOnly: boolean;
  severity: AuditEventSeverity | "";
  category: AuditEventCategory | "";
  eventType: string;
  branchId: string;
  preset: LogsPreset;
  customFrom: string;
  customTo: string;
};

export type LogsDockMode = "event" | "diagnostics" | null;

export type LogsTheatreProps = {
  branches: { id: string; name: string }[];
  draft: LogsDraftFilters;
  onDraftChange: (patch: Partial<LogsDraftFilters>) => void;
  onApply: () => void;
  onReset: () => void;
  onPresetChange: (preset: LogsPreset) => void;
  onFailuresOnlyChange: (value: boolean) => void;
  onSeverityChip: (severity: AuditEventSeverity | "") => void;
  onCategoryChip: (category: AuditEventCategory | "") => void;
  rows: AuditEventRecord[];
  total: number;
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  summary: AuditEventSummary | null;
  summaryLoading: boolean;
  selectedId: string | null;
  dockMode: LogsDockMode;
  selectedEvent: AuditEventRecord | null;
  onSelectEvent: (event: AuditEventRecord) => void;
  onOpenDiagnostics: () => void;
  onClearSelection: () => void;
  mobileDetailOpen: boolean;
  search: string;
  onSearchChange: (value: string) => void;
};

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

export function humanizeEventType(eventType: string): string {
  return eventType
    .split(/[._]/)
    .map((token) => {
      const up = token.toUpperCase();
      if (EVENT_TOKEN_OVERRIDES[up]) return EVENT_TOKEN_OVERRIDES[up];
      if (!token) return token;
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(" ");
}

export function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SeverityBadge({ severity }: { severity: AuditEventSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-none border px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
        SEVERITY_BADGE[severity],
      )}
    >
      {severity === "WARN" || severity === "ERROR" || severity === "CRITICAL" ? (
        <AlertTriangle className="size-3" aria-hidden />
      ) : null}
      {severity}
    </span>
  );
}

function CategoryChip({ category }: { category: AuditEventCategory }) {
  return (
    <span className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function JsonBlock({ label, raw }: { label: string; raw: string | null }) {
  if (!raw || !raw.trim()) return null;
  let pretty = raw;
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    /* keep raw text */
  }
  return (
    <div className="space-y-1.5">
      <p className={dashboardFilterFieldLabelClass()}>{label}</p>
      <pre className="overflow-x-auto whitespace-pre-wrap wrap-break-word rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] p-3 font-mono text-[11px] leading-relaxed text-foreground">
        {pretty}
      </pre>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="min-w-0">
      <dt className={dashboardFilterFieldLabelClass()}>{label}</dt>
      <dd className="mt-1 wrap-break-word text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function EventDetail({ event }: { event: AuditEventRecord }) {
  return (
    <div className="space-y-5 px-3 py-3 sm:px-4">
      <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <DetailRow
          label="Actor"
          value={
            [event.actorName, event.actorType].filter(Boolean).join(" · ") ||
            event.actorId
          }
        />
        <DetailRow
          label="Target"
          value={
            [event.targetLabel, event.targetType].filter(Boolean).join(" · ") ||
            event.targetId
          }
        />
        <DetailRow label="Branch" value={event.branchId} />
        <DetailRow label="Source" value={event.source} />
        <DetailRow label="Terminal" value={event.terminalId} />
        <DetailRow label="Shift" value={event.shiftId} />
        <DetailRow label="Session" value={event.sessionId} />
        <DetailRow label="IP address" value={event.ipAddress} />
        <DetailRow label="Correlation ID" value={event.correlationId} />
        <DetailRow label="Event type" value={event.eventType} />
        <DetailRow label="When" value={formatEventTime(event.createdAt)} />
      </dl>
      {event.userAgent ? (
        <p className="wrap-break-word font-mono text-[11px] text-muted-foreground">
          {event.userAgent}
        </p>
      ) : null}
      {event.reason ? (
        <div className="space-y-1.5">
          <p className={dashboardFilterFieldLabelClass()}>Reason</p>
          <p className="text-sm leading-relaxed text-foreground">{event.reason}</p>
        </div>
      ) : null}
      <div className="grid gap-4">
        <JsonBlock label="Metadata" raw={event.metadata} />
        <JsonBlock label="Diff" raw={event.diff} />
        <JsonBlock label="Before" raw={event.oldState} />
        <JsonBlock label="After" raw={event.newState} />
      </div>
    </div>
  );
}

function LogsContextBanner({
  draft,
  summary,
  summaryLoading,
  total,
  loading,
  onPresetChange,
  onFailuresOnlyChange,
  onSeverityChip,
  onCategoryChip,
}: {
  draft: LogsDraftFilters;
  summary: AuditEventSummary | null;
  summaryLoading: boolean;
  total: number;
  loading: boolean;
  onPresetChange: (preset: LogsPreset) => void;
  onFailuresOnlyChange: (value: boolean) => void;
  onSeverityChip: (severity: AuditEventSeverity | "") => void;
  onCategoryChip: (category: AuditEventCategory | "") => void;
}) {
  const periodChips: { id: LogsPreset; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "24h", label: "24h" },
    { id: "7d", label: "7d" },
    { id: "30d", label: "30d" },
  ];

  const warn = summary?.bySeverity.WARN ?? 0;
  const error = summary?.bySeverity.ERROR ?? 0;
  const critical = summary?.bySeverity.CRITICAL ?? 0;
  const topCategories = useMemo(() => {
    if (!summary?.byCategory) return [];
    return (Object.entries(summary.byCategory) as [AuditEventCategory, number][])
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [summary]);

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
            ? "Loading activity…"
            : `${total.toLocaleString()} ${total === 1 ? "event" : "events"}`}
        </span>
        {summary && !summaryLoading ? (
          <span className={dashboardHintClass()}>
            {(summary.total ?? 0).toLocaleString()} in period
          </span>
        ) : null}
      </p>

      <div
        className="flex flex-wrap gap-0.5 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-0.5"
        role="group"
        aria-label="Time range"
      >
        {periodChips.map((chip) => {
          const active = draft.preset === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onPresetChange(chip.id)}
              className={cn(
                "inline-flex h-7 items-center justify-center px-2 text-[10px] font-semibold transition-colors",
                active
                  ? "bg-[var(--pos-primary,#0f766e)] text-white"
                  : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground",
              )}
            >
              {chip.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onPresetChange("custom")}
          className={cn(
            "inline-flex h-7 items-center justify-center px-2 text-[10px] font-semibold transition-colors",
            draft.preset === "custom"
              ? "bg-[var(--pos-primary,#0f766e)] text-white"
              : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:text-foreground",
          )}
        >
          Custom
        </button>
      </div>

      <button
        type="button"
        onClick={() => onFailuresOnlyChange(!draft.failuresOnly)}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-none border px-2 text-[10px] font-semibold transition-colors",
          draft.failuresOnly
            ? "border-[#9a2e16]/50 bg-[color-mix(in_srgb,#9a2e16_10%,white)] text-[#9a2e16]"
            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground hover:text-foreground",
        )}
      >
        <AlertTriangle className="size-3" aria-hidden />
        Failures only
      </button>

      <div className="flex flex-wrap gap-1">
        {(
          [
            { sev: "WARN" as const, n: warn },
            { sev: "ERROR" as const, n: error },
            { sev: "CRITICAL" as const, n: critical },
          ] as const
        ).map(({ sev, n }) => {
          const active = !draft.failuresOnly && draft.severity === sev;
          return (
            <button
              key={sev}
              type="button"
              onClick={() => onSeverityChip(active ? "" : sev)}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-none border px-2 text-[10px] font-semibold tabular-nums transition-colors",
                active
                  ? "border-[#9a2e16]/50 bg-[color-mix(in_srgb,#9a2e16_10%,white)] text-[#9a2e16]"
                  : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-muted-foreground hover:text-foreground",
                summaryLoading && "opacity-60",
              )}
            >
              {sev}
              <span className="font-mono">{n.toLocaleString()}</span>
            </button>
          );
        })}
        {topCategories.map(([cat, n]) => {
          const active = draft.category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChip(active ? "" : cat)}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-none border px-2 text-[10px] font-semibold tabular-nums transition-colors",
                active
                  ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
                  : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-muted-foreground hover:text-foreground",
                summaryLoading && "opacity-60",
              )}
            >
              {CATEGORY_LABELS[cat]}
              <span className="font-mono">{n.toLocaleString()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatStrip({
  label,
  value,
  accent,
  dim,
}: {
  label: string;
  value: number;
  accent?: "warn" | "error" | "critical";
  dim?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white px-3.5 py-3",
        accent === "warn" &&
          "border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_4%,white)]",
        accent === "error" &&
          "border-[#9a2e16]/40 bg-[color-mix(in_srgb,#9a2e16_6%,white)]",
        accent === "critical" &&
          "border-[#9a2e16]/50 bg-[color-mix(in_srgb,#9a2e16_8%,white)]",
        dim && "opacity-60",
      )}
    >
      <p
        className="text-[1.65rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {value.toLocaleString()}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function LogsPulse({
  summary,
  summaryLoading,
  failuresOnly,
  onFailuresOnlyChange,
  recentFailures,
  onSelectEvent,
  className,
}: {
  summary: AuditEventSummary | null;
  summaryLoading: boolean;
  failuresOnly: boolean;
  onFailuresOnlyChange: (value: boolean) => void;
  recentFailures: AuditEventRecord[];
  onSelectEvent: (event: AuditEventRecord) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden px-5 py-6 sm:px-8",
        className,
      )}
    >
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

      <div className="relative z-[1] max-w-lg">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Activity pulse
        </p>
        <h3
          className="mt-2 text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          What happened
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[22rem]")}>
          Condensed severity for the selected period. Flip on failures-only to
          surface WARN+ events — login failures, bad keys, failed payments.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatStrip
            label="Events"
            value={summary?.total ?? 0}
            dim={summaryLoading}
          />
          <StatStrip
            label="Warnings"
            value={summary?.bySeverity.WARN ?? 0}
            accent="warn"
            dim={summaryLoading}
          />
          <StatStrip
            label="Errors"
            value={summary?.bySeverity.ERROR ?? 0}
            accent="error"
            dim={summaryLoading}
          />
          <StatStrip
            label="Critical"
            value={summary?.bySeverity.CRITICAL ?? 0}
            accent="critical"
            dim={summaryLoading}
          />
        </div>

        {!failuresOnly ? (
          <button
            type="button"
            onClick={() => onFailuresOnlyChange(true)}
            className="mt-4 inline-flex h-8 items-center gap-1.5 border border-[#9a2e16]/35 bg-white px-3 text-[11px] font-semibold text-[#9a2e16] transition-colors hover:bg-[color-mix(in_srgb,#9a2e16_6%,white)]"
          >
            <AlertTriangle className="size-3.5" aria-hidden />
            Show failures only
          </button>
        ) : (
          <p className={cn(dashboardHintClass(), "mt-4 text-[#9a2e16]")}>
            Filtering WARN, ERROR, and CRITICAL.
          </p>
        )}

        {recentFailures.length > 0 ? (
          <div className="mt-6 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white/90 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Recent issues
            </p>
            <ul className="mt-2 space-y-1.5">
              {recentFailures.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelectEvent(row)}
                    className="flex w-full items-center justify-between gap-2 text-left text-[12px] font-semibold tracking-[-0.015em] text-foreground underline-offset-2 hover:underline"
                  >
                    <span className="truncate">
                      {humanizeEventType(row.eventType)}
                    </span>
                    <SeverityBadge severity={row.severity} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LogsFocus({
  event,
  className,
}: {
  event: AuditEventRecord;
  className?: string;
}) {
  const actor =
    [event.actorName, event.actorType].filter(Boolean).join(" · ") ||
    event.actorId ||
    "Unknown actor";

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
          className="grid size-16 place-items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white text-[var(--order-ink,#15231f)] shadow-[0_10px_28px_color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
          aria-hidden
        >
          <ScrollText className="size-6" />
        </span>
        <h3
          className="mt-4 text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {humanizeEventType(event.eventType)}
        </h3>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          {event.eventType}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <SeverityBadge severity={event.severity} />
          <CategoryChip category={event.category} />
        </div>
        <dl className="mt-6 grid w-full grid-cols-2 gap-2 text-left">
          <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white/80 px-2.5 py-2">
            <dt className={dashboardHintClass()}>When</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {formatEventTime(event.createdAt)}
            </dd>
          </div>
          <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white/80 px-2.5 py-2">
            <dt className={dashboardHintClass()}>Actor</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold">{actor}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function DiagnosticsFocus({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-6",
        className,
      )}
    >
      <div className="relative z-[1] flex max-w-sm flex-col items-center text-center">
        <span
          className="grid size-16 place-items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white text-[var(--order-ink,#15231f)]"
          aria-hidden
        >
          <MonitorSmartphone className="size-6" />
        </span>
        <h3
          className="mt-4 text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Device diagnostics
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3")}>
          Browser-only API reachability and config errors for this device —
          never shared with cashiers as toasts.
        </p>
      </div>
    </div>
  );
}

export function LogsTheatre(props: LogsTheatreProps) {
  const {
    branches,
    draft,
    onDraftChange,
    onApply,
    onReset,
    onPresetChange,
    onFailuresOnlyChange,
    onSeverityChip,
    onCategoryChip,
    rows,
    total,
    totalPages,
    page,
    onPageChange,
    loading,
    error,
    onRetry,
    summary,
    summaryLoading,
    selectedId,
    dockMode,
    selectedEvent,
    onSelectEvent,
    onOpenDiagnostics,
    onClearSelection,
    mobileDetailOpen,
    search,
    onSearchChange,
  } = props;

  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        row.eventType,
        humanizeEventType(row.eventType),
        row.category,
        row.actorName ?? "",
        row.actorType ?? "",
        row.targetLabel ?? "",
        row.targetType ?? "",
        row.reason ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const recentFailures = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            r.severity === "WARN" ||
            r.severity === "ERROR" ||
            r.severity === "CRITICAL",
        )
        .slice(0, 5),
    [rows],
  );

  const hasDockSelection = dockMode === "event" || dockMode === "diagnostics";
  const drawerOpen = hasDockSelection && (isLg || mobileDetailOpen);
  const showCustomRange = draft.preset === "custom";
  const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, total);

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
              placeholder="Event, actor, target…"
              aria-label="Search events on this page"
            />
          </label>

          <div className="flex items-center justify-between gap-2">
            <p className={cn(dashboardHintClass(), "tabular-nums")}>
              {loading && rows.length === 0
                ? "Loading…"
                : `${filteredRows.length.toLocaleString()} on page`}
              {search.trim() ? " matching" : ""}
              {total > 0
                ? ` · ${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`
                : null}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1 rounded-none px-2 text-[11px]"
                onClick={() => setFiltersOpen((o) => !o)}
              >
                Filters
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1 rounded-none px-2 text-[11px]"
                disabled={loading}
                onClick={onRetry}
              >
                {loading ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-3" aria-hidden />
                )}
              </Button>
            </div>
          </div>

          {filtersOpen ? (
            <div className="space-y-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-2">
              <div className="grid gap-2">
                <label className="grid gap-0.5 text-[11px]">
                  <span className={dashboardHintClass()}>Severity</span>
                  <select
                    className={cn(
                      dashboardSelectClass(draft.failuresOnly),
                      "h-8 py-0 text-[11px]",
                    )}
                    disabled={draft.failuresOnly}
                    value={draft.failuresOnly ? "WARN" : draft.severity}
                    onChange={(e) =>
                      onDraftChange({
                        severity: e.target.value as AuditEventSeverity | "",
                      })
                    }
                  >
                    <option value="">Any severity</option>
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-0.5 text-[11px]">
                  <span className={dashboardHintClass()}>Category</span>
                  <select
                    className={cn(dashboardSelectClass(), "h-8 py-0 text-[11px]")}
                    value={draft.category}
                    onChange={(e) =>
                      onDraftChange({
                        category: e.target.value as AuditEventCategory | "",
                      })
                    }
                  >
                    <option value="">All categories</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-0.5 text-[11px]">
                  <span className={dashboardHintClass()}>Event type</span>
                  <input
                    className={cn(dashboardInputClass(), "h-8 text-[11px]")}
                    list="audit-event-type-options"
                    placeholder="e.g. sale.completed"
                    value={draft.eventType}
                    onChange={(e) => onDraftChange({ eventType: e.target.value })}
                  />
                  <datalist id="audit-event-type-options">
                    {KNOWN_FAILURE_EVENT_TYPES.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </label>
                <label className="grid gap-0.5 text-[11px]">
                  <span className={dashboardHintClass()}>Branch</span>
                  <select
                    className={cn(dashboardSelectClass(), "h-8 py-0 text-[11px]")}
                    value={draft.branchId}
                    onChange={(e) => onDraftChange({ branchId: e.target.value })}
                  >
                    <option value="">All branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                {showCustomRange ? (
                  <>
                    <label className="grid gap-0.5 text-[11px]">
                      <span className={dashboardHintClass()}>From</span>
                      <input
                        type="datetime-local"
                        className={cn(dashboardInputClass(), "h-8 text-[11px]")}
                        value={draft.customFrom}
                        onChange={(e) =>
                          onDraftChange({ customFrom: e.target.value })
                        }
                      />
                    </label>
                    <label className="grid gap-0.5 text-[11px]">
                      <span className={dashboardHintClass()}>To</span>
                      <input
                        type="datetime-local"
                        className={cn(dashboardInputClass(), "h-8 text-[11px]")}
                        value={draft.customTo}
                        onChange={(e) =>
                          onDraftChange({ customTo: e.target.value })
                        }
                      />
                    </label>
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 flex-1 rounded-none text-[11px]"
                  onClick={onApply}
                >
                  Apply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none px-2 text-[11px]"
                  onClick={onReset}
                >
                  Reset
                </Button>
              </div>
              {draft.failuresOnly ? (
                <p className={cn(dashboardHintClass(), "leading-relaxed")}>
                  Showing WARN+ — login failures, invalid keys, failed STK /
                  webhooks, and server exceptions.
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            id="diagnostics"
            onClick={onOpenDiagnostics}
            className={cn(
              "flex w-full items-center gap-2 border px-2 py-1.5 text-left transition-colors",
              dockMode === "diagnostics"
                ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
            )}
          >
            <MonitorSmartphone
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-foreground">
                Device diagnostics
              </span>
              <span className="block text-[10px] text-muted-foreground">
                This browser only
              </span>
            </span>
            <ChevronRight
              className="size-3.5 shrink-0 text-muted-foreground/70"
              aria-hidden
            />
          </button>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {error ? (
            <div className="px-2 py-3">
              <DashboardLoadError
                title="Could not load the activity log"
                message={error}
                onRetry={onRetry}
              />
            </div>
          ) : loading && rows.length === 0 ? (
            <p
              className={cn(
                dashboardHintClass(),
                "flex items-center justify-center gap-2 px-3 py-10",
              )}
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading…
            </p>
          ) : filteredRows.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <Inbox
                className="mx-auto size-7 text-muted-foreground/60"
                aria-hidden
              />
              <p className="mt-2 text-[14px] font-semibold text-foreground">
                {rows.length === 0
                  ? draft.failuresOnly
                    ? "No failures in this period"
                    : "No activity in this period"
                  : "No events match search"}
              </p>
              <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem]")}>
                {rows.length === 0
                  ? draft.failuresOnly
                    ? "Widen the range or clear failures-only."
                    : "Try widening the time range or clearing filters."
                  : "Try another phrase on this page."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filteredRows.map((row) => {
                const active = selectedId === row.id && dockMode === "event";
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEvent(row)}
                      className={cn(
                        "relative flex w-full items-start gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <SeverityBadge severity={row.severity} />
                          <time
                            dateTime={row.createdAt}
                            className="truncate text-[10px] tabular-nums text-muted-foreground"
                          >
                            {formatEventTime(row.createdAt)}
                          </time>
                        </div>
                        <p
                          className={cn(
                            "mt-1 truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {humanizeEventType(row.eventType)}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
                          <CategoryChip category={row.category} />
                          <span className="truncate font-mono">
                            {row.eventType}
                          </span>
                        </p>
                      </div>
                      {!denser ? (
                        <ChevronRight
                          className="mt-1 size-4 shrink-0 text-muted-foreground/70"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2">
            <p className={cn(dashboardHintClass(), "tabular-nums")}>
              Page {page + 1}/{totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-none px-2"
                disabled={page === 0 || loading}
                onClick={() => onPageChange(Math.max(0, page - 1))}
              >
                <ChevronLeft className="size-3.5" aria-hidden />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-none px-2"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              >
                <ChevronRight className="size-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const room =
    dockMode === "diagnostics" ? (
      <DiagnosticsFocus className="h-full min-h-0" />
    ) : selectedEvent && dockMode === "event" ? (
      <LogsFocus event={selectedEvent} className="h-full min-h-0" />
    ) : loading && !summary ? (
      <div className="flex h-full items-center justify-center px-6">
        <p className={cn(dashboardHintClass(), "text-center")}>
          Loading overview…
        </p>
      </div>
    ) : (
      <LogsPulse
        summary={summary}
        summaryLoading={summaryLoading}
        failuresOnly={draft.failuresOnly}
        onFailuresOnlyChange={onFailuresOnlyChange}
        recentFailures={recentFailures}
        onSelectEvent={onSelectEvent}
        className="h-full min-h-0"
      />
    );

  const inspect = hasDockSelection ? null : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick an event
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          The centre shows severity for the period. Select a row for full
          metadata, diffs, and actor context — or open device diagnostics.
        </p>
      </div>
      {(summary?.bySeverity.ERROR ?? 0) + (summary?.bySeverity.CRITICAL ?? 0) >
      0 ? (
        <p
          className={cn(
            dashboardHintClass(),
            "flex items-center gap-1.5 text-[#9a2e16]",
          )}
        >
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          {(summary?.bySeverity.ERROR ?? 0) +
            (summary?.bySeverity.CRITICAL ?? 0)}{" "}
          error/critical in period
        </p>
      ) : (
        <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
          <ScrollText className="size-3.5 shrink-0" aria-hidden />
          Newest events first
        </p>
      )}
    </div>
  );

  const drawerTitle =
    dockMode === "diagnostics"
      ? "Device diagnostics"
      : selectedEvent
        ? humanizeEventType(selectedEvent.eventType)
        : "Event";
  const drawerDescription =
    dockMode === "diagnostics"
      ? "This browser only — cashiers never see these."
      : selectedEvent
        ? [
            selectedEvent.severity,
            CATEGORY_LABELS[selectedEvent.category],
            formatEventTime(selectedEvent.createdAt),
          ].join(" · ")
        : undefined;

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <LogsContextBanner
        draft={draft}
        summary={summary}
        summaryLoading={summaryLoading}
        total={total}
        loading={loading}
        onPresetChange={onPresetChange}
        onFailuresOnlyChange={onFailuresOnlyChange}
        onSeverityChip={onSeverityChip}
        onCategoryChip={onCategoryChip}
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
            {dockMode === "diagnostics"
              ? "Diagnostics"
              : dockMode === "event"
                ? "Event"
                : "Logs pulse"}
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && hasDockSelection ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) onClearSelection();
        }}
        contextLabel="Activity log"
        title={drawerTitle}
        description={drawerDescription}
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
      >
        {hasDockSelection ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-white",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            {dockMode === "diagnostics" ? (
              <div className="p-3 sm:p-4">
                <OpsClientLogsPanel />
              </div>
            ) : selectedEvent ? (
              <EventDetail event={selectedEvent} />
            ) : null}
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
