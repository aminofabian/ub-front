"use client";

import type { ReactNode } from "react";

import {
  PROCUREMENT_VARS,
  ProcurementHubNav,
} from "@/components/procurement/procurement-hub-nav";
import { cn } from "@/lib/utils";

export function SupplierPageLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col px-3 pb-4 pt-2 sm:px-5 sm:pb-6 sm:pt-2.5",
        className,
      )}
      style={PROCUREMENT_VARS}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(100%_80%_at_10%_-30%,color-mix(in_srgb,var(--pos-primary)_12%,transparent),transparent_55%)]"
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-1.5">
        <div className="shrink-0 rounded-lg border border-[color-mix(in_srgb,var(--order-ink)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-slip)_92%,transparent)] p-0.5 shadow-[0_1px_0_color-mix(in_srgb,var(--order-ink)_6%,transparent)] backdrop-blur-sm">
          <ProcurementHubNav />
        </div>

        {children}
      </div>
    </div>
  );
}

export { PROCUREMENT_VARS };
