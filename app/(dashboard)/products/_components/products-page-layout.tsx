"use client";

import type { ReactNode } from "react";

import { ProductsHubNav } from "@/components/products/products-hub-nav";
import { cn } from "@/lib/utils";

export const PRODUCTS_CATALOG_VARS = {
  ["--catalog-primary" as string]: "#0f766e",
  ["--catalog-ink" as string]: "#15231f",
  ["--catalog-shelf" as string]: "#f3f6f5",
  ["--catalog-slip" as string]: "#ffffff",
} as const;

export function ProductsPageLayout({
  children,
  headerActions,
  headerExtra,
  className,
}: {
  children: ReactNode;
  headerActions?: ReactNode;
  /** e.g. attention filter chips below the title row */
  headerExtra?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col px-2 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3",
        className,
      )}
      style={PRODUCTS_CATALOG_VARS}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(120%_100%_at_12%_-20%,color-mix(in_srgb,var(--catalog-primary)_14%,transparent),transparent_60%),linear-gradient(180deg,color-mix(in_srgb,var(--catalog-shelf)_85%,#fff),transparent)]"
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-2.5 sm:gap-3">
        <div className="shrink-0 rounded-xl border border-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)] bg-[color-mix(in_srgb,var(--catalog-slip)_92%,transparent)] p-1 shadow-[0_1px_0_color-mix(in_srgb,var(--catalog-ink)_6%,transparent),0_12px_40px_-24px_color-mix(in_srgb,var(--catalog-ink)_18%,transparent)] backdrop-blur-sm">
          <ProductsHubNav />
        </div>

        <header className="shrink-0 space-y-2 px-0.5 sm:px-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--catalog-ink)_42%,transparent)]">
                Products
              </p>
              <h1 className="mt-1 font-heading text-xl font-semibold tracking-[-0.03em] text-[var(--catalog-ink)] sm:text-2xl">
                Add products
              </h1>
              <p className="mt-1 hidden max-w-2xl text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink)_58%,transparent)] sm:block sm:text-sm">
                Name it, set a buying and selling price, add how many you have.
                That is enough to sell at the till.
              </p>
            </div>
            {headerActions ? (
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {headerActions}
              </div>
            ) : null}
          </div>
          {headerExtra}
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
