"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, Inbox, Loader2 } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_FILTER_WELL,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardLoadError,
  dashboardFilterFieldLabelClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchAuditEvents,
  fetchAuditEventSummary,
  type AuditEventCategory,
  type AuditEventRecord,
  type AuditEventSeverity,
  type AuditEventSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

const CATEGORY_LABELS: Record<AuditEventCategory, string> = {
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
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS) as AuditEventCategory[];

const SEVERITIES: AuditEventSeverity[] = [
  "DEBUG",
  "INFO",
  "WARN",
  "ERROR",
  "CRITICAL",
];

const SEVERITY_BADGE: Record<AuditEventSeverity, string> = {
  DEBUG: "border-border/70 bg-muted/40 text-muted-foreground",
  INFO: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  WARN: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ERROR: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
  CRITICAL: "border-red-600/30 bg-red-600/15 text-red-800 dark:text-red-200",
};

/** Event types the backend can emit as failures/issues — quick filter help. */
const KNOWN_FAILURE_EVENT_TYPES = [
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

type Preset = "today" | "24h" | "7d" | "30d" | "custom";

type DraftFilters = {
  failuresOnly: boolean;
  severity: AuditEventSeverity | "";
  category: AuditEventCategory | "";
  eventType: string;
  branchId: string;
  preset: Preset;
  customFrom: string;
  customTo: string;
};

type AppliedFilters = {
  branchId?: string;
  category?: AuditEventCategory;
  eventType?: string;
  severity?: AuditEventSeverity;
  minSeverity?: AuditEventSeverity;
  from?: string;
  to?: string;
};

const DEFAULT_DRAFT: DraftFilters = {
  failuresOnly: false,
  severity: "",
  category: "",
  eventType: "",
  branchId: "",
  preset: "today",
  customFrom: "",
  customTo: "",
};

function startOfLocalDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function applyPreset(draft: DraftFilters): AppliedFilters {
  const now = new Date();
  let from: Date | undefined;
  let to: Date | undefined;
  if (draft.preset === "today") {
    from = startOfLocalDay();
  } else if (draft.preset === "24h") {
    from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (draft.preset === "7d") {
    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (draft.preset === "30d") {
    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (draft.customFrom.trim()) {
    const parsed = new Date(draft.customFrom);
    from = Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (draft.preset === "custom" && draft.customTo.trim()) {
    const parsed = new Date(draft.customTo);
    to = Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const filters: AppliedFilters = {};
  if (draft.branchId.trim()) filters.branchId = draft.branchId.trim();
  if (draft.category) filters.category = draft.category;
  if (draft.eventType.trim()) filters.eventType = draft.eventType.trim();
  if (draft.failuresOnly) {
    filters.minSeverity = "WARN";
  } else if (draft.severity) {
    filters.severity = draft.severity;
  }
  if (from) filters.from = from.toISOString();
  if (to) filters.to = to.toISOString();
  return filters;
}

function humanizeEventType(eventType: string): string {
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

function formatTime(iso: string): string {
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
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tracking-wide",
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
    <span className="rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
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
      <pre className="overflow-x-auto whitespace-pre-wrap wrap-break-word rounded-lg border border-border/50 bg-muted/30 p-3 font-mono text-[11px] leading-relaxed text-foreground">
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

function EventDetail({ event }: { event: AuditEventRecord }) {
  return (
    <div className="space-y-5 border-t border-border/60 bg-muted/15 px-5 py-5 sm:px-6">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <div className="grid gap-5 lg:grid-cols-2">
        <JsonBlock label="Metadata" raw={event.metadata} />
        <JsonBlock label="Diff" raw={event.diff} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <JsonBlock label="Before" raw={event.oldState} />
        <JsonBlock label="After" raw={event.newState} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accentClass,
  dim,
}: {
  label: string;
  value: number;
  accentClass?: string;
  dim?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-black/2 dark:ring-white/4",
        accentClass,
        dim && "opacity-60",
      )}
    >
      <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export function AuditLogPanel() {
  const { branches } = useDashboard();
  const [draft, setDraft] = useState<DraftFilters>(DEFAULT_DRAFT);
  const [applied, setApplied] = useState<AppliedFilters>(() =>
    applyPreset(DEFAULT_DRAFT),
  );
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AuditEventRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [summary, setSummary] = useState<AuditEventSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    fetchAuditEventSummary(applied)
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch(() => {
        /* header cards are non-critical */
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAuditEvents({ ...applied, page, size: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setRows(result.content);
        setTotal(result.totalElements);
        setTotalPages(result.totalPages);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load the activity log.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied, page, retry]);

  const showCustomRange = draft.preset === "custom";
  const failuresNote = draft.failuresOnly;

  const apply = () => {
    setApplied(applyPreset(draft));
    setPage(0);
    setExpandedId(null);
  };

  const reset = () => {
    setDraft(DEFAULT_DRAFT);
    setApplied(applyPreset(DEFAULT_DRAFT));
    setPage(0);
    setExpandedId(null);
  };

  const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <div className={DASHBOARD_FILTER_WELL}>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { value: false, label: "All events" },
              { value: true, label: "Failures only" },
            ] as const
          ).map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() =>
                setDraft((d) => ({ ...d, failuresOnly: option.value }))
              }
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                draft.failuresOnly === option.value
                  ? "border-primary/30 bg-primary/10 text-foreground"
                  : "border-border/70 bg-card/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5">
            <span className={dashboardFilterFieldLabelClass()}>Severity</span>
            <select
              className={dashboardSelectClass(draft.failuresOnly)}
              disabled={draft.failuresOnly}
              value={draft.failuresOnly ? "WARN" : draft.severity}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  severity: e.target.value as AuditEventSeverity | "",
                }))
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

          <label className="space-y-1.5">
            <span className={dashboardFilterFieldLabelClass()}>Category</span>
            <select
              className={dashboardSelectClass()}
              value={draft.category}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  category: e.target.value as AuditEventCategory | "",
                }))
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

          <label className="space-y-1.5">
            <span className={dashboardFilterFieldLabelClass()}>Event type</span>
            <input
              className={dashboardInputClass()}
              list="audit-event-type-options"
              placeholder="e.g. sale.completed"
              value={draft.eventType}
              onChange={(e) =>
                setDraft((d) => ({ ...d, eventType: e.target.value }))
              }
            />
            <datalist id="audit-event-type-options">
              {KNOWN_FAILURE_EVENT_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>

          <label className="space-y-1.5">
            <span className={dashboardFilterFieldLabelClass()}>Branch</span>
            <select
              className={dashboardSelectClass()}
              value={draft.branchId}
              onChange={(e) =>
                setDraft((d) => ({ ...d, branchId: e.target.value }))
              }
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className={dashboardFilterFieldLabelClass()}>Time range</span>
            <select
              className={dashboardSelectClass()}
              value={draft.preset}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  preset: e.target.value as Preset,
                }))
              }
            >
              <option value="today">Today</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom…</option>
            </select>
          </label>

          {showCustomRange ? (
            <>
              <label className="space-y-1.5">
                <span className={dashboardFilterFieldLabelClass()}>From</span>
                <input
                  type="datetime-local"
                  className={dashboardInputClass()}
                  value={draft.customFrom}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, customFrom: e.target.value }))
                  }
                />
              </label>
              <label className="space-y-1.5">
                <span className={dashboardFilterFieldLabelClass()}>To</span>
                <input
                  type="datetime-local"
                  className={dashboardInputClass()}
                  value={draft.customTo}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, customTo: e.target.value }))
                  }
                />
              </label>
            </>
          ) : null}

          <div className="flex items-end gap-2">
            <Button type="button" size="sm" onClick={apply}>
              Apply filters
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>

        {failuresNote ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Showing WARN, ERROR, and CRITICAL events — login failures, invalid
            API keys, failed STK pushes, webhook/scheduler failures, and server
            exceptions.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Events" value={summary?.total ?? 0} dim={summaryLoading} />
        <StatCard
          label="Warnings"
          value={summary?.bySeverity.WARN ?? 0}
          accentClass="border-amber-500/20 bg-amber-500/[0.04]"
          dim={summaryLoading}
        />
        <StatCard
          label="Errors"
          value={summary?.bySeverity.ERROR ?? 0}
          accentClass="border-red-500/25 bg-red-500/[0.05]"
          dim={summaryLoading}
        />
        <StatCard
          label="Critical"
          value={summary?.bySeverity.CRITICAL ?? 0}
          accentClass="border-red-600/30 bg-red-600/[0.06]"
          dim={summaryLoading}
        />
      </div>

      {error ? (
        <DashboardLoadError
          title="Could not load the activity log"
          message={error}
          onRetry={() => setRetry((r) => r + 1)}
        />
      ) : (
        <div className={DASHBOARD_TABLE_SURFACE}>
          <div
            className={cn(
              DASHBOARD_TABLE_HEAD,
              "flex flex-wrap items-center justify-between gap-3",
            )}
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {loading && rows.length === 0
                  ? "Loading…"
                  : `${total.toLocaleString()} ${total === 1 ? "event" : "events"}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {total > 0
                  ? `Showing ${start.toLocaleString()}–${end.toLocaleString()} · newest first`
                  : "Audit log for this business"}
              </p>
            </div>
            {loading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
            ) : null}
          </div>

          {rows.length === 0 && !loading ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground">
                <Inbox className="size-5" aria-hidden />
              </span>
              <p className="text-sm font-medium text-foreground">
                {draft.failuresOnly
                  ? "No failures recorded in this period"
                  : "No activity recorded in this period"}
              </p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                {draft.failuresOnly
                  ? "Good news — or the failure emitters have not recorded anything yet. Try widening the time range."
                  : "Try widening the time range or clearing filters."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map((row) => {
                const expanded = expandedId === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(expanded ? null : row.id)
                      }
                      className={cn(
                        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-left transition-colors sm:grid-cols-[8.5rem_minmax(0,1fr)_6rem_7.5rem_9rem_1.75rem] sm:px-6",
                        "hover:bg-muted/25 focus-visible:bg-muted/25 focus-visible:outline-none",
                      )}
                    >
                      <time
                        dateTime={row.createdAt}
                        className="text-xs tabular-nums text-muted-foreground"
                      >
                        {formatTime(row.createdAt)}
                      </time>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {humanizeEventType(row.eventType)}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <CategoryChip category={row.category} />
                          <span className="truncate font-mono text-[10px] text-muted-foreground">
                            {row.eventType}
                          </span>
                        </span>
                      </span>
                      <span className="justify-self-end sm:justify-self-auto">
                        <SeverityBadge severity={row.severity} />
                      </span>
                      <span className="hidden truncate text-xs text-muted-foreground sm:block">
                        {row.actorName ?? row.actorType}
                      </span>
                      <span className="hidden truncate text-xs text-muted-foreground sm:block">
                        {row.targetLabel ?? row.targetType}
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 justify-self-end text-muted-foreground transition-transform",
                          expanded && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </button>
                    {expanded ? <EventDetail event={row} /> : null}
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 bg-muted/20 px-5 py-3 sm:px-6">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1 || loading}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
