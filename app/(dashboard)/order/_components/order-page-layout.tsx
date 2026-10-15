"use client";

import type { ReactNode } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  PROCUREMENT_VARS,
  ProcurementHubNav,
} from "@/components/procurement/procurement-hub-nav";
import { cn } from "@/lib/utils";

export function OrderPageLayout({
  children,
  title,
  description,
  showHeader = false,
  header,
  className,
  mobileScroll = false,
  hideHubOnPhone = false,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  showHeader?: boolean;
  /** Replaces the default title/description header block. */
  header?: ReactNode;
  className?: string;
  /**
   * Phones/tablets: let the page grow and scroll in the shell instead of
   * locking to the viewport height. Needed when a child panel's own footer is
   * taller than a phone screen, so the primary actions stay reachable.
   * Height-locked split panes resume at `lg`.
   */
  mobileScroll?: boolean;
  /** Phones already have the app tab bar. Hide the buying-journey row there. */
  hideHubOnPhone?: boolean;
}) {
  const { me } = useDashboard();
  const isStockManager =
    me?.role?.key?.trim().toLowerCase() === "stock_manager";

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full min-w-0 max-w-[1400px] flex-col bg-[#f4f7f5] px-0 pt-0 sm:px-5 sm:pt-1.5 xl:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
        mobileScroll
          ? "lg:h-full lg:min-h-0 lg:overflow-hidden"
          : "h-full min-h-0 overflow-hidden",
        isStockManager &&
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
        className,
      )}
      style={PROCUREMENT_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-1">
        <div
          className={cn(
            "shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink)_8%,transparent)] bg-white sm:rounded-2xl sm:border",
            hideHubOnPhone && "max-sm:hidden",
            isStockManager &&
              "shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
          )}
        >
          <ProcurementHubNav />
        </div>

        {header ? (
          <div className="shrink-0 px-3 sm:px-0">{header}</div>
        ) : null}

        {showHeader && title && !header ? (
          <header className="shrink-0 px-0.5 sm:px-1">
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.03em] text-[var(--order-ink)] sm:text-[1.65rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--order-ink)_62%,transparent)] sm:text-sm">
                {description}
              </p>
            ) : null}
          </header>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

export { PROCUREMENT_VARS as ORDER_VARS };
