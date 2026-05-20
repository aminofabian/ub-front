"use client";

import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  TESTING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  TESTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  ERROR: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  ACTIVE: "bg-emerald-500 text-white",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  TESTING: "Testing…",
  TESTED: "Ready",
  ERROR: "Error",
  ACTIVE: "Active",
};

export function GatewayStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
