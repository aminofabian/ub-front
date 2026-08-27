"use client";

import type { ReactNode } from "react";

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
  className,
}: {
  children: ReactNode;
  headerActions?: ReactNode;
  branchScope?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col px-3 pb-6 pt-3 sm:px-5 sm:pb-8 sm:pt-4",
        className,
      )}
      style={PROCUREMENT_VARS}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(120%_100%_at_12%_-20%,color-mix(in_srgb,var(--pos-primary)_14%,transparent),transparent_60%),linear-gradient(180deg,color-mix(in_srgb,var(--order-shelf)_85%,#fff),transparent)]"
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-4">
        <div className="shrink-0 rounded-xl border border-[color-mix(in_srgb,var(--order-ink)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-slip)_92%,transparent)] p-1 shadow-[0_1px_0_color-mix(in_srgb,var(--order-ink)_6%,transparent),0_12px_40px_-24px_color-mix(in_srgb,var(--order-ink)_18%,transparent)] backdrop-blur-sm">
          <ProcurementHubNav />
        </div>

        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 px-0.5 sm:px-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--order-ink)_42%,transparent)]">
              Procurement
            </p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.03em] text-[var(--order-ink)] sm:text-[1.65rem]">
              Record delivery
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--order-ink)_58%,transparent)] sm:text-sm">
              Vendor receipts, open payables, and supplier wallet deposits
              {branchScope ? (
                <>
                  {" "}
                  · <span className="font-medium">{branchScope}</span>
                </>
              ) : null}
            </p>
          </div>
          {headerActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {headerActions}
            </div>
          ) : null}
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 pb-16 sm:pb-0">{children}</div>
      </div>
    </div>
  );
}
