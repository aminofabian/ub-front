"use client";

import { AlertTriangle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BatchAlert } from "@/lib/api";

export function BatchAlerts({ alerts }: { alerts: BatchAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const isDanger = alert.kind === "danger";
        const isWarning = alert.kind === "warning";
        const isInfo = alert.kind === "info";

        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm",
              isDanger && "border-rose-200 bg-rose-50 text-rose-900",
              isWarning && "border-amber-200 bg-amber-50 text-amber-900",
              isInfo && "border-sky-200 bg-sky-50 text-sky-900",
            )}
          >
            {isDanger ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            ) : isWarning ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            )}
            <span className="font-medium">{alert.message}</span>
          </div>
        );
      })}
    </div>
  );
}
