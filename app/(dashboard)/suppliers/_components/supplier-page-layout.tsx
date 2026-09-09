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
        "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col bg-white px-3 pt-1 sm:px-5 sm:pt-1.5",
        className,
      )}
      style={PROCUREMENT_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-1">
        <div className="shrink-0 rounded-none border border-[color-mix(in_srgb,var(--order-ink)_12%,transparent)] bg-white">
          <ProcurementHubNav />
        </div>

        {children}
      </div>
    </div>
  );
}

export { PROCUREMENT_VARS };
