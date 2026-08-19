"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  clearOpsClientLog,
  readOpsClientLog,
  subscribeOpsClientLog,
  type OpsClientLogEntry,
} from "@/lib/ops-client-log";

const DEFAULT_EMPTY =
  "When a till cannot reach the API, the technical detail lands here instead of a toast. Logs stay on this browser so cashiers never see deployment config.";
const DEFAULT_STORAGE = "Stored on this device only. Cashiers do not see these.";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function kindLabel(kind: OpsClientLogEntry["kind"]): string {
  return kind === "api_config" ? "Config" : "Unreachable";
}

export function OpsClientLogsPanel({
  emptyDescription = DEFAULT_EMPTY,
  storageNote = DEFAULT_STORAGE,
}: {
  emptyDescription?: string;
  storageNote?: string;
}) {
  const [rows, setRows] = useState<OpsClientLogEntry[]>([]);

  useEffect(() => {
    const sync = () => setRows(readOpsClientLog());
    sync();
    return subscribeOpsClientLog(sync);
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold tracking-tight">This browser</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {rows.length === 0 ? (
              storageNote
            ) : (
              <>
                <span className="font-medium text-foreground tabular-nums">{rows.length}</span>{" "}
                {rows.length === 1 ? "event" : "events"} · {storageNote}
              </>
            )}
          </p>
        </div>
        {rows.length > 0 ? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => clearOpsClientLog()}>
            <Trash2 className="size-3.5" aria-hidden />
            Clear log
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-10 sm:px-5">
          <p className="text-sm font-medium text-foreground">No client API errors</p>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">{emptyDescription}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((row) => (
            <li key={row.id} className="space-y-2 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={row.kind === "api_config" ? "secondary" : "outline"}>
                  {kindLabel(row.kind)}
                </Badge>
                <time dateTime={row.at}>{formatWhen(row.at)}</time>
                {row.count > 1 ? <span className="tabular-nums">×{row.count}</span> : null}
                {row.href ? (
                  <span className="min-w-0 truncate font-mono text-[11px]">{row.href}</span>
                ) : null}
              </div>
              {row.path ? (
                <p className="break-all font-mono text-[11px] text-muted-foreground">{row.path}</p>
              ) : null}
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted/35 p-3 font-mono text-[12px] leading-relaxed text-foreground">
                {row.message}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
