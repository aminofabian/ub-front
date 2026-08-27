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
  className,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  showHeader?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[1400px] px-3 pb-6 pt-3 sm:px-5 sm:pb-8 sm:pt-4",
        className,
      )}
      style={PROCUREMENT_VARS}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(120%_100%_at_12%_-20%,color-mix(in_srgb,var(--pos-primary)_14%,transparent),transparent_60%),linear-gradient(180deg,color-mix(in_srgb,var(--order-shelf)_85%,#fff),transparent)]"
      />

      <div className="relative space-y-4">
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--order-ink)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-slip)_92%,transparent)] p-1 shadow-[0_1px_0_color-mix(in_srgb,var(--order-ink)_6%,transparent),0_12px_40px_-24px_color-mix(in_srgb,var(--order-ink)_18%,transparent)] backdrop-blur-sm">
          <ProcurementHubNav columns={2} />
        </div>

        {showHeader && title ? (
          <header className="px-0.5 sm:px-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--order-ink)_42%,transparent)]">
              Procurement
            </p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.03em] text-[var(--order-ink)] sm:text-[1.65rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--order-ink)_58%,transparent)] sm:text-sm">
                {description}
              </p>
            ) : null}
          </header>
        ) : null}

        {children}
      </div>
    </div>
  );
}

export { PROCUREMENT_VARS as ORDER_VARS };
