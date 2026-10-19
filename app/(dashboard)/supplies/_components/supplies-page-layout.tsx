"use client";

import type { ReactNode } from "react";
import { Package } from "lucide-react";

import {
  PROCUREMENT_VARS,
  ProcurementHubNav,
} from "@/components/procurement/procurement-hub-nav";
import { cn } from "@/lib/utils";

import { salesSurface } from "@/components/sales/sales-surface";

const SUPPLIES_ROSTER_WASH = "bg-[var(--op-surface)]";

export const SUPPLIES_SURFACE = cn(salesSurface, "overflow-hidden");

export const SUPPLIES_THEATRE = cn(
  salesSurface,
  "overflow-hidden",
  SUPPLIES_ROSTER_WASH,
  "lg:h-[min(80dvh,52rem)]",
);

export function SuppliesPageLayout({
  children,
  headerActions,
  branchScope,
  meta,
  className,
}: {
  children: ReactNode;
  headerActions?: ReactNode;
  branchScope?: string | null;
  /** Short status line next to the title (e.g. unpaid count). */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "premium-procurement relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col bg-[var(--op-bg)] px-3 pt-1 sm:px-5 sm:pt-1.5",
        className,
      )}
      style={PROCUREMENT_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-3">
        <div className={cn("shrink-0 overflow-hidden", SUPPLIES_SURFACE)}>
          <ProcurementHubNav />
        </div>

        <header
          className={cn(
            SUPPLIES_SURFACE,
            "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 sm:px-4",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] text-[var(--op-accent)]">
                <Package className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h1
                  className="truncate text-[1.6rem] font-normal tracking-[-0.02em] text-[var(--op-ink)]"
                  style={{
                    fontFamily:
                      'var(--font-cormorant), Georgia, "Times New Roman", serif',
                  }}
                >
                  Records
                </h1>
                <p className="hidden truncate text-[12px] text-[#667085] sm:block">
                  Deliveries · bills · deposits
                </p>
              </div>
            </div>

            <span
              aria-hidden
              className={cn("hidden h-3.5 w-px sm:block", "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]")}
            />

            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {branchScope ? (
                <span className="truncate font-medium text-foreground">
                  {branchScope}
                </span>
              ) : null}
              {meta}
            </div>
          </div>

          {headerActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {headerActions}
            </div>
          ) : null}
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 pb-16 sm:pb-0">
          {children}
        </div>
      </div>
    </div>
  );
}
