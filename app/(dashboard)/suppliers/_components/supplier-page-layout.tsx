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
        "relative mx-auto flex w-full max-w-[1400px] flex-col bg-transparent px-3 pt-1 sm:px-5 sm:pt-1.5 lg:h-full lg:min-h-0",
        className,
      )}
      style={PROCUREMENT_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-3">
        <div className="shrink-0 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
          <ProcurementHubNav />
        </div>

        {children}
      </div>
    </div>
  );
}

export { PROCUREMENT_VARS };
