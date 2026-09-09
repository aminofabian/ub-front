"use client";

import type { ReactNode } from "react";
import { Package } from "lucide-react";

import {
  PROCUREMENT_VARS,
  ProcurementHubNav,
} from "@/components/procurement/procurement-hub-nav";
import { cn } from "@/lib/utils";

export const SUPPLIES_SURFACE =
  "overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white shadow-[0_1px_0_color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent),0_12px_40px_-24px_color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)]";

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

        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm sm:px-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--pos-primary,#0f766e)] text-white">
                <Package className="size-3.5" aria-hidden />
              </span>
              <h1 className="truncate font-heading text-base font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)] sm:text-[1.05rem]">
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 pb-16 sm:pb-0">
          {children}
        </div>
      </div>
    </div>
  );
}
