"use client";

import type { ReactNode } from "react";
import { Package } from "lucide-react";

import {
  PROCUREMENT_VARS,
  ProcurementHubNav,
} from "@/components/procurement/procurement-hub-nav";
import { cn } from "@/lib/utils";

export const SUPPLIES_SURFACE =
  "overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white";

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
        "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col bg-white px-3 pt-1 sm:px-5 sm:pt-1.5",
        className,
      )}
      style={PROCUREMENT_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-2">
        <div className="shrink-0 rounded-none border border-[color-mix(in_srgb,var(--order-ink)_12%,transparent)] bg-white">
          <ProcurementHubNav />
        </div>

        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2.5 py-1.5 sm:px-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]">
                <Package className="size-3.5" aria-hidden />
              </span>
              <h1 className="truncate font-heading text-[15px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
                Supplies
              </h1>
            </div>

            <span
              aria-hidden
              className="hidden h-3.5 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
            />

            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
              {branchScope ? (
                <span className="truncate font-medium text-[var(--order-ink,#15231f)]">
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 pb-16 sm:pb-0">
          {children}
        </div>
      </div>
    </div>
  );
}
