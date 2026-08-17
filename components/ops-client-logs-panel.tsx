"use client";

import { useEffect, useState } from "react";
import { ScrollText, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
} from "@/components/dashboard-page-ui";
import {
  clearOpsClientLog,
  readOpsClientLog,
  subscribeOpsClientLog,
  type OpsClientLogEntry,
} from "@/lib/ops-client-log";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function kindLabel(kind: OpsClientLogEntry["kind"]): string {
  return kind === "api_config" ? "Config" : "Unreachable";
}

export function OpsClientLogsPanel() {
  const [rows, setRows] = useState<OpsClientLogEntry[]>([]);

  useEffect(() => {
    const sync = () => setRows(readOpsClientLog());
    sync();
    return subscribeOpsClientLog(sync);
  }, []);

  if (rows.length === 0) {
    return (
      <div className={cn(DASHBOARD_SECTION_SURFACE, "flex items-start gap-4")}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground">
          <ScrollText className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">No client API errors</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            When a till cannot reach the API, the technical detail lands here
            instead of a toast. Logs stay on this browser so cashiers never see
            deployment config.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={DASHBOARD_TABLE_SURFACE}>
      <div className={cn(DASHBOARD_TABLE_HEAD, "flex flex-wrap items-center justify-between gap-3")}>
        <div>
          <p className="text-sm font-medium text-foreground">
            {rows.length} {rows.length === 1 ? "event" : "events"}
          </p>
          <p className="text-xs text-muted-foreground">
            Stored on this device only. Cashiers do not see these.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => clearOpsClientLog()}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Clear log
        </Button>
      </div>
      <ul className="divide-y divide-border/60">
        {rows.map((row) => (
          <li key={row.id} className="space-y-2 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 font-medium text-foreground">
                {kindLabel(row.kind)}
              </span>
              <time dateTime={row.at}>{formatWhen(row.at)}</time>
              {row.count > 1 ? (
                <span className="tabular-nums">×{row.count}</span>
              ) : null}
              {row.href ? (
                <span className="truncate font-mono text-[11px]">{row.href}</span>
              ) : null}
            </div>
            {row.path ? (
              <p className="font-mono text-[11px] text-muted-foreground">{row.path}</p>
            ) : null}
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-border/50 bg-muted/30 p-3 font-mono text-[12px] leading-relaxed text-foreground">
              {row.message}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
