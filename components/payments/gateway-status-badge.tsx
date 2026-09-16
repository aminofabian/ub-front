"use client";

import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:
    "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground",
  TESTING:
    "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground",
  TESTED:
    "rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-transparent text-[var(--pos-primary,#0f766e)]",
  ERROR:
    "rounded-none border border-[#9a2e16]/35 bg-transparent text-[#9a2e16]",
  ACTIVE:
    "rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[var(--pos-primary,#0f766e)] text-white",
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
        "inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
        STATUS_STYLES[status] ??
          "rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground",
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
