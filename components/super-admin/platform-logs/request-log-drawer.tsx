"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  FlaskConical,
  Waypoints,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import type { PlatformRequestLogRow } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  CATEGORY_BADGE,
  CATEGORY_LABELS,
  formatDateTime,
  formatDuration,
  isExpectedHostLookup,
  shortId,
  statusTone,
} from "./platform-logs-shared";

/**
 * Right-side detail panel for one request-log row: path, tenant, actor, timing,
 * and — for failures — the full Problem+JSON / exception capture with a
 * "Read full error" expander.
 */
export function RequestLogDrawerContent({ row }: { row: PlatformRequestLogRow }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [errorOpen, setErrorOpen] = useState(!row.success && !isExpectedHostLookup(row));
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
    const raw = typeof requestMeta?.problemJson === "string" ? requestMeta.problemJson : null;
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
      window.setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 1600);
    } catch {
      // Clipboard can be denied; the field remains selectable by hand.
    }
  };

  const fullErrorReport = buildFullErrorReport(row, requestMeta, problemPretty);

  const fields: Array<{
    label: string;
    value: string;
    copyKey?: string;
    copyValue?: string;
    mono?: boolean;
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn("border-transparent", CATEGORY_BADGE[row.category])}
        >
          {CATEGORY_LABELS[row.category]}
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            "border-transparent",
            expected
              ? "bg-slate-500/10 text-slate-500 dark:text-slate-400"
              : row.success
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400",
          )}
        >
          {row.success ? "Successful" : expected ? "Expected miss" : "Failed"}
        </Badge>
      </div>

      {failed ? (
        <div className="overflow-hidden rounded-xl border border-red-500/30 bg-red-500/[0.06]">
          <div className="flex items-start gap-2.5 px-3.5 py-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                {row.errorTitle || `HTTP ${row.status}`}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-red-900/80 dark:text-red-100/80">
                {row.errorDetail ||
                  (hasCapturedError
                    ? "Failure recorded — open full detail below."
                    : "No error body was captured for this row (logged before error capture shipped, or the failure happened outside the API handler). Use the correlation id to grep server logs.")}
              </p>
              {row.errorType ? (
                <p className="mt-2 truncate font-mono text-[11px] text-red-800/70 dark:text-red-200/70">
                  {row.errorType}
                </p>
              ) : null}
              {row.exceptionClass ? (
                <p className="mt-1 truncate font-mono text-[11px] text-red-800/70 dark:text-red-200/70">
                  {row.exceptionClass}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-red-500/20 px-3.5 py-2.5">
            <Button
              type="button"
              size="sm"
              variant={errorOpen ? "secondary" : "default"}
              className="gap-1.5"
              onClick={() => setErrorOpen((v) => !v)}
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", errorOpen && "rotate-180")}
                aria-hidden
              />
              {errorOpen ? "Hide full error" : "Read full error"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => void copy("fullError", fullErrorReport)}
            >
              {copied === "fullError" ? (
                <Check className="size-3.5 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )}
              Copy full report
            </Button>
          </div>

          {errorOpen ? (
            <div className="space-y-3 border-t border-red-500/20 bg-background/60 px-3.5 py-3.5">
              <ErrorBlock
                title="Problem detail"
                copied={copied === "errorDetail"}
                onCopy={() => void copy("errorDetail", row.errorDetail || row.errorTitle || "")}
              >
                {row.errorDetail || row.errorTitle || "—"}
              </ErrorBlock>

              {row.exceptionChain ? (
                <ErrorBlock
                  title="Exception chain"
                  mono
                  copied={copied === "chain"}
                  onCopy={() => void copy("chain", row.exceptionChain || "")}
                >
                  {row.exceptionChain}
                </ErrorBlock>
              ) : null}

              {row.stackSummary ? (
                <ErrorBlock
                  title="Stack summary"
                  mono
                  copied={copied === "stack"}
                  onCopy={() => void copy("stack", row.stackSummary || "")}
                >
                  {row.stackSummary}
                </ErrorBlock>
              ) : null}

              {problemPretty ? (
                <ErrorBlock
                  title="Problem+JSON"
                  mono
                  copied={copied === "problem"}
                  onCopy={() => void copy("problem", problemPretty)}
                >
                  {problemPretty}
                </ErrorBlock>
              ) : null}

              {requestMeta ? (
                <ErrorBlock
                  title="Request meta"
                  mono
                  copied={copied === "meta"}
                  onCopy={() => void copy("meta", JSON.stringify(requestMeta, null, 2))}
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
                  mono
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

      <div className="rounded-xl border border-border/70 bg-muted/30">
        <p className="px-3 pt-2.5 text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
          Endpoint
        </p>
        <p className="break-all px-3 pb-3 pt-1 font-mono text-[13px] leading-relaxed text-foreground">
          {row.method} {row.path}
        </p>
      </div>

      <dl className="divide-y divide-border/60 rounded-xl border border-border/70">
        {fields.map((field) => (
          <div key={field.label} className="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{field.label}</dt>
            <dd className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "truncate text-right text-[13px]",
                  field.mono ? "font-mono text-muted-foreground" : "font-medium text-foreground",
                )}
              >
                {field.value}
              </span>
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <FlaskConical className="size-4" aria-hidden />
          View run in Load test console
        </Link>
      ) : null}

      <div className="rounded-xl border border-border/70 bg-primary/4 p-3.5">
        <div className="flex items-center gap-2">
          <Waypoints className="size-4 text-primary" aria-hidden />
          <p className="text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
            Correlation id — trace this request in API logs
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-mono text-[13px] text-foreground">
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
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Grep{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">correlationId=…</code>{" "}
          in the backend logs to see the full server-side trace for this request.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
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
  mono,
  copied,
  onCopy,
}: {
  title: string;
  children: string;
  mono?: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-2.5 py-1.5">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
        <CopyButton label={title} copied={copied} onCopy={onCopy} />
      </div>
      <pre
        className={cn(
          "max-h-64 overflow-auto whitespace-pre-wrap break-words px-2.5 py-2 text-[12px] leading-relaxed text-foreground",
          mono && "font-mono",
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
      className={cn("size-6 shrink-0 rounded-md", copied && "text-emerald-600 dark:text-emerald-400")}
      aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
      onClick={onCopy}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
    </Button>
  );
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function parseMeta(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
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
