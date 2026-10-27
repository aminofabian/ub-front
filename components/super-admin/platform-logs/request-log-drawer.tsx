"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  FlaskConical,
  Waypoints,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import type { PlatformRequestLogRow } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  formatClock,
  formatDateTime,
  formatDuration,
  isExpectedHostLookup,
  shortId,
  statusTone,
} from "./platform-logs-shared";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--op-ink,#121A16)_12%,transparent)]";
const HAIRLINE_SOFT =
  "border-[color-mix(in_srgb,var(--op-ink,#121A16)_8%,transparent)]";
const DIVIDE_SOFT =
  "divide-[color-mix(in_srgb,var(--op-ink,#121A16)_8%,transparent)]";
const MUTED = "text-[color-mix(in_srgb,var(--op-ink,#121A16)_66%,transparent)]";
const FAINT = "text-[color-mix(in_srgb,var(--op-ink,#121A16)_58%,transparent)]";
const INK = "text-[var(--op-ink,#121A16)]";
const ACCENT = "text-[var(--op-accent,#1D4B3B)]";
const DANGER = "text-[var(--op-highlight,#A55237)]";

/**
 * Right-hand inspector for one request: identity, tenant, actor, timing, and —
 * for failures — the Problem+JSON / exception capture. Reads as a page of the
 * operator console: hairlines, mono for machine values, terracotta for the one
 * thing that went wrong.
 */
export function RequestLogDrawerContent({ row }: { row: PlatformRequestLogRow }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [errorOpen, setErrorOpen] = useState(
    !row.success && !isExpectedHostLookup(row),
  );
  const expected = isExpectedHostLookup(row);
  const failed = !row.success && !expected;
  const hasCapturedError = Boolean(
    row.errorTitle ||
      row.errorDetail ||
      row.exceptionClass ||
      row.exceptionChain ||
      row.stackSummary ||
      row.requestMeta,
  );

  const requestMeta = useMemo(() => parseMeta(row.requestMeta), [row.requestMeta]);
  const problemPretty = useMemo(() => {
    const raw =
      typeof requestMeta?.problemJson === "string"
        ? requestMeta.problemJson
        : null;
    if (!raw) return null;
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }, [requestMeta]);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(
        () => setCopied((prev) => (prev === key ? null : prev)),
        1600,
      );
    } catch {
      // Clipboard can be denied; the field remains selectable by hand.
    }
  };

  const fullErrorReport = buildFullErrorReport(row, requestMeta, problemPretty);
  const CategoryIcon = CATEGORY_ICONS[row.category];

  const fields: Array<{
    label: string;
    value: string;
    copyKey?: string;
    copyValue?: string;
    mono?: boolean;
    href?: string;
  }> = [
    { label: "Timestamp", value: formatDateTime(row.loggedAt) },
    { label: "Method", value: row.method, mono: true },
    {
      label: "Status",
      value: `${row.status} ${row.success ? "· ok" : expected ? "· expected miss" : "· failed"}`,
      mono: true,
    },
    { label: "Duration", value: formatDuration(row.durationMs), mono: true },
    {
      label: "Tenant",
      value: row.businessName ?? "—",
      copyKey: "tenant",
      copyValue: row.businessId ?? "",
      href: row.businessId
        ? `/super-admin/businesses/${encodeURIComponent(row.businessId)}`
        : undefined,
    },
    {
      label: "Tenant id",
      value: row.businessId ?? "—",
      copyKey: "tenantId",
      copyValue: row.businessId ?? "",
      mono: true,
    },
    {
      label: "User id",
      value: row.userId ? shortId(row.userId) : "—",
      copyKey: "user",
      copyValue: row.userId ?? "",
      mono: true,
    },
    {
      label: "Branch id",
      value: row.branchId ? shortId(row.branchId) : "—",
      copyKey: "branch",
      copyValue: row.branchId ?? "",
      mono: true,
    },
    {
      label: "IP address",
      value: row.ip ?? "—",
      copyKey: "ip",
      copyValue: row.ip ?? "",
      mono: true,
    },
    {
      label: "User agent",
      value: row.userAgent ? truncate(row.userAgent, 64) : "—",
      copyKey: row.userAgent ? "ua" : undefined,
      copyValue: row.userAgent ?? "",
      mono: true,
    },
  ];

  if (row.loadTestRunId) {
    fields.splice(4, 0, {
      label: "Load test run",
      value: row.loadTestRunId,
      copyKey: "loadTestRun",
      copyValue: row.loadTestRunId,
      mono: true,
    });
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex items-baseline justify-between gap-2 border px-2.5 py-1.5",
          HAIRLINE,
        )}
      >
        <p className={cn("min-w-0 truncate text-[11px] font-semibold", INK)}>
          {row.businessName || row.businessId || "Platform"}
        </p>
        <p className={cn("shrink-0 font-mono text-[10px] tabular-nums", MUTED)}>
          {formatClock(row.loggedAt)} · {formatDuration(row.durationMs)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex h-6 items-center gap-1.5 border px-2 text-[9.5px] font-semibold uppercase tracking-[0.1em]",
            HAIRLINE,
            INK,
          )}
        >
          <CategoryIcon className={cn("size-3", FAINT)} aria-hidden />
          {CATEGORY_LABELS[row.category]}
        </span>
        <span
          className={cn(
            "inline-flex h-6 items-center border px-2 text-[9.5px] font-semibold uppercase tracking-[0.1em]",
            HAIRLINE,
            failed ? DANGER : row.success ? ACCENT : MUTED,
          )}
        >
          {row.success ? "Successful" : expected ? "Expected miss" : "Failed"}
        </span>
        {row.loadTestRunId ? (
          <span
            className={cn(
              "inline-flex h-6 items-center border px-2 text-[9.5px] font-semibold uppercase tracking-[0.1em]",
              HAIRLINE,
              MUTED,
            )}
          >
            Load test
          </span>
        ) : null}
      </div>

      {failed ? (
        <div
          className={cn(
            "border border-l-2 border-l-[var(--op-highlight,#A55237)]",
            HAIRLINE,
          )}
        >
          <div className="flex items-start gap-2.5 px-3 py-2.5">
            <AlertTriangle
              className={cn("mt-0.5 size-4 shrink-0", DANGER)}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className={cn("text-[13px] font-semibold leading-snug", DANGER)}>
                {row.errorTitle || `HTTP ${row.status}`}
              </p>
              <p
                className={cn(
                  "mt-1 whitespace-pre-wrap break-words text-[11.5px] leading-relaxed",
                  INK,
                )}
              >
                {row.errorDetail ||
                  (hasCapturedError
                    ? "Failure recorded — open full detail below."
                    : "No error body was captured for this row (logged before error capture shipped, or the failure happened outside the API handler). Use the correlation id to grep server logs.")}
              </p>
              {row.errorType ? (
                <p className={cn("mt-1.5 truncate font-mono text-[10px]", FAINT)}>
                  {row.errorType}
                </p>
              ) : null}
              {row.exceptionClass ? (
                <p className={cn("mt-0.5 truncate font-mono text-[10px]", FAINT)}>
                  {row.exceptionClass}
                </p>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              "flex flex-wrap gap-1.5 border-t px-3 py-2",
              HAIRLINE_SOFT,
            )}
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 rounded-none px-2 text-[11px]"
              onClick={() => setErrorOpen((value) => !value)}
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  errorOpen && "rotate-180",
                )}
                aria-hidden
              />
              {errorOpen ? "Hide full error" : "Read full error"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 rounded-none px-2 text-[11px]"
              onClick={() => void copy("fullError", fullErrorReport)}
            >
              {copied === "fullError" ? (
                <Check className={cn("size-3.5", ACCENT)} aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )}
              Copy report
            </Button>
          </div>

          {errorOpen ? (
            <div
              className={cn(
                "space-y-2 border-t bg-[color-mix(in_srgb,var(--op-ink,#121A16)_2%,var(--op-surface,#FCFAF5))] px-3 py-3",
                HAIRLINE_SOFT,
              )}
            >
              <ErrorBlock
                title="Problem detail"
                copied={copied === "errorDetail"}
                onCopy={() =>
                  void copy("errorDetail", row.errorDetail || row.errorTitle || "")
                }
              >
                {row.errorDetail || row.errorTitle || "—"}
              </ErrorBlock>

              {row.exceptionChain ? (
                <ErrorBlock
                  title="Exception chain"
                  copied={copied === "chain"}
                  onCopy={() => void copy("chain", row.exceptionChain || "")}
                >
                  {row.exceptionChain}
                </ErrorBlock>
              ) : null}

              {row.stackSummary ? (
                <ErrorBlock
                  title="Stack summary"
                  copied={copied === "stack"}
                  onCopy={() => void copy("stack", row.stackSummary || "")}
                >
                  {row.stackSummary}
                </ErrorBlock>
              ) : null}

              {problemPretty ? (
                <ErrorBlock
                  title="Problem+JSON"
                  copied={copied === "problem"}
                  onCopy={() => void copy("problem", problemPretty)}
                >
                  {problemPretty}
                </ErrorBlock>
              ) : null}

              {requestMeta ? (
                <ErrorBlock
                  title="Request meta"
                  copied={copied === "meta"}
                  onCopy={() =>
                    void copy("meta", JSON.stringify(requestMeta, null, 2))
                  }
                >
                  {JSON.stringify(
                    {
                      contentType: requestMeta.contentType ?? null,
                      accept: requestMeta.accept ?? null,
                      origin: requestMeta.origin ?? null,
                      referer: requestMeta.referer ?? null,
                      query: requestMeta.query ?? null,
                    },
                    null,
                    2,
                  )}
                </ErrorBlock>
              ) : null}

              {row.userAgent ? (
                <ErrorBlock
                  title="User agent"
                  copied={copied === "uaFull"}
                  onCopy={() => void copy("uaFull", row.userAgent || "")}
                >
                  {row.userAgent}
                </ErrorBlock>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={cn("border", HAIRLINE)}>
        <p
          className={cn(
            "border-b px-2.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em]",
            HAIRLINE_SOFT,
            MUTED,
          )}
        >
          Endpoint
        </p>
        <p className={cn("break-all px-2.5 py-2 font-mono text-[11.5px] leading-relaxed", INK)}>
          {row.method} {row.path}
        </p>
      </div>

      <dl className={cn("divide-y border", HAIRLINE, DIVIDE_SOFT)}>
        {fields.map((field) => (
          <div
            key={field.label}
            className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] items-center gap-3 px-2.5 py-1.5"
          >
            <dt
              className={cn(
                "truncate text-[9.5px] font-semibold uppercase tracking-[0.06em]",
                MUTED,
              )}
            >
              {field.label}
            </dt>
            <dd className="flex min-w-0 items-center justify-end gap-1">
              {field.href ? (
                <Link
                  href={field.href}
                  className={cn(
                    "flex min-w-0 items-center gap-0.5 truncate text-[11.5px] font-medium underline decoration-dotted underline-offset-2",
                    INK,
                    "hover:text-[var(--op-accent,#1D4B3B)]",
                  )}
                >
                  <span className="truncate">{field.value}</span>
                  <ArrowUpRight className="size-3 shrink-0" aria-hidden />
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate text-right text-[11.5px]",
                    field.mono ? cn("font-mono", MUTED) : cn("font-medium", INK),
                  )}
                >
                  {field.value}
                </span>
              )}
              {field.copyKey && field.copyValue ? (
                <CopyButton
                  label={field.label}
                  copied={copied === field.copyKey}
                  onCopy={() => void copy(field.copyKey!, field.copyValue!)}
                />
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      {row.loadTestRunId ? (
        <Link
          href={`${APP_ROUTES.superAdminPlatformLoadTest}?run=${encodeURIComponent(row.loadTestRunId)}`}
          className={cn(
            "inline-flex w-full items-center justify-center gap-1.5 border px-3 py-2 text-[11px] font-semibold transition-colors",
            HAIRLINE,
            ACCENT,
            "hover:bg-[var(--op-accent-soft,#EEF2EC)]",
          )}
        >
          <FlaskConical className="size-3.5" aria-hidden />
          View run in Load test console
        </Link>
      ) : null}

      <div className={cn("border px-2.5 py-2", HAIRLINE)}>
        <div className="flex items-center gap-1.5">
          <Waypoints className={cn("size-3.5", ACCENT)} aria-hidden />
          <p
            className={cn(
              "text-[9.5px] font-semibold uppercase tracking-[0.12em]",
              MUTED,
            )}
          >
            Correlation id — trace in API logs
          </p>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <p className={cn("min-w-0 flex-1 truncate font-mono text-[11.5px]", INK)}>
            {row.correlationId ?? "—"}
          </p>
          {row.correlationId ? (
            <CopyButton
              label="Correlation id"
              copied={copied === "correlation"}
              onCopy={() => void copy("correlation", row.correlationId ?? "")}
            />
          ) : null}
        </div>
        <p className={cn("mt-1.5 text-[10px] leading-relaxed", MUTED)}>
          Grep{" "}
          <code
            className={cn(
              "border px-1 py-0.5 font-mono text-[9.5px]",
              HAIRLINE,
              FAINT,
            )}
          >
            correlationId=…
          </code>{" "}
          in the backend logs for the full server-side trace.
        </p>
      </div>

      <p className={cn("text-[9.5px]", FAINT)}>
        Row id <span className="font-mono">{row.id}</span> · status code{" "}
        <span className={cn("font-mono font-medium", statusTone(row.status, row.success))}>
          {row.status}
        </span>
      </p>
    </div>
  );
}

function ErrorBlock({
  title,
  children,
  copied,
  onCopy,
}: {
  title: string;
  children: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className={cn("border", HAIRLINE)}>
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b px-2.5 py-1",
          HAIRLINE_SOFT,
        )}
      >
        <p
          className={cn(
            "text-[9.5px] font-semibold uppercase tracking-[0.12em]",
            MUTED,
          )}
        >
          {title}
        </p>
        <CopyButton label={title} copied={copied} onCopy={onCopy} />
      </div>
      <pre
        className={cn(
          "max-h-64 overflow-auto whitespace-pre-wrap break-words px-2.5 py-2 font-mono text-[10.5px] leading-relaxed",
          INK,
        )}
      >
        {children}
      </pre>
    </div>
  );
}

function CopyButton({
  label,
  copied,
  onCopy,
}: {
  label: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      className={cn(
        "size-5 shrink-0 rounded-none",
        copied && ACCENT,
      )}
      aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
      onClick={onCopy}
    >
      {copied ? (
        <Check className="size-3" aria-hidden />
      ) : (
        <Copy className="size-3" aria-hidden />
      )}
    </Button>
  );
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function parseMeta(
  raw: string | null | undefined,
): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function buildFullErrorReport(
  row: PlatformRequestLogRow,
  meta: Record<string, unknown> | null,
  problemPretty: string | null,
): string {
  const lines = [
    `Platform request failure`,
    `=======================`,
    `Logged at: ${row.loggedAt}`,
    `Method: ${row.method}`,
    `Path: ${row.path}`,
    `Status: ${row.status}`,
    `Duration: ${row.durationMs} ms`,
    `Category: ${row.category}`,
    `Correlation id: ${row.correlationId ?? "—"}`,
    `Tenant: ${row.businessName ?? "—"} (${row.businessId ?? "—"})`,
    `User id: ${row.userId ?? "—"}`,
    `Branch id: ${row.branchId ?? "—"}`,
    `IP: ${row.ip ?? "—"}`,
    `User agent: ${row.userAgent ?? "—"}`,
    `Load test run: ${row.loadTestRunId ?? "—"}`,
    ``,
    `Error title: ${row.errorTitle ?? "—"}`,
    `Error type: ${row.errorType ?? "—"}`,
    `Error detail:`,
    row.errorDetail ?? "—",
    ``,
    `Exception class: ${row.exceptionClass ?? "—"}`,
    `Exception chain:`,
    row.exceptionChain ?? "—",
    ``,
    `Stack summary:`,
    row.stackSummary ?? "—",
    ``,
    `Problem+JSON:`,
    problemPretty ?? "—",
    ``,
    `Request meta:`,
    meta ? JSON.stringify(meta, null, 2) : "—",
    ``,
    `Row id: ${row.id}`,
  ];
  return lines.join("\n");
}
