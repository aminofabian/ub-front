"use client";

import type { ReactNode } from "react";

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
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  showHeader?: boolean;
  /** Replaces the default title/description header block. */
  header?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col bg-white px-3 pt-2 sm:px-5 sm:pt-3",
        className,
      )}
      style={PROCUREMENT_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-2">
        <div className="shrink-0 rounded-none border border-[color-mix(in_srgb,var(--order-ink)_12%,transparent)] bg-white">
          <ProcurementHubNav />
        </div>

        {header ? <div className="shrink-0">{header}</div> : null}

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
