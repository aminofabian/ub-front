"use client";

import { useState } from "react";

import { Check, Copy, Waypoints } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlatformRequestLogRow } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  CATEGORY_BADGE,
  CATEGORY_LABELS,
  formatDateTime,
  formatDuration,
  shortId,
  statusTone,
} from "./platform-logs-shared";

/**
 * Right-side detail panel for one request-log row: the full path, tenant and
 * actor, IP, timing, and — the tracing key — the correlation id, each copyable.
 */
export function RequestLogDrawerContent({ row }: { row: PlatformRequestLogRow }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 1600);
    } catch {
      // Clipboard can be denied; the field remains selectable by hand.
    }
  };

  const fields: Array<{ label: string; value: string; copyKey?: string; copyValue?: string; mono?: boolean }> = [
    { label: "Timestamp", value: formatDateTime(row.loggedAt) },
    { label: "Method", value: row.method, mono: true },
    { label: "Status", value: `${row.status} ${row.success ? "· ok" : "· failed"}`, mono: true },
    { label: "Duration", value: formatDuration(row.durationMs), mono: true },
    { label: "Tenant", value: row.businessName ?? "—", copyKey: "tenant", copyValue: row.businessId ?? "" },
    { label: "Tenant id", value: row.businessId ?? "—", copyKey: "tenantId", copyValue: row.businessId ?? "", mono: true },
    { label: "User id", value: row.userId ? shortId(row.userId) : "—", copyKey: "user", copyValue: row.userId ?? "", mono: true },
    { label: "Branch id", value: row.branchId ? shortId(row.branchId) : "—", copyKey: "branch", copyValue: row.branchId ?? "", mono: true },
    { label: "IP address", value: row.ip ?? "—", copyKey: "ip", copyValue: row.ip ?? "", mono: true },
  ];

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
            row.success
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400",
          )}
        >
          {row.success ? "Successful" : "Failed"}
        </Badge>
      </div>

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
          Grep <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">correlationId=…</code>{" "}
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
