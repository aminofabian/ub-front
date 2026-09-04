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
  /** e.g. attention filter chips below the toolbar */
  headerExtra?: ReactNode;
  className?: string;
}) {
  const showToolbar = Boolean(headerActions || headerExtra);

  return (
    <div
      className={cn(
        "relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col px-2 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-2.5",
        className,
      )}
      style={PRODUCTS_CATALOG_VARS}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(120%_100%_at_12%_-20%,color-mix(in_srgb,var(--catalog-primary)_12%,transparent),transparent_60%),linear-gradient(180deg,color-mix(in_srgb,var(--catalog-shelf)_85%,#fff),transparent)]"
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-2">
        <div className="shrink-0 rounded-none border border-[color-mix(in_srgb,var(--catalog-ink)_8%,transparent)] bg-[color-mix(in_srgb,var(--catalog-slip)_94%,transparent)] p-0.5">
          <ProductsHubNav />
        </div>

        {showToolbar ? (
          <header className="shrink-0 space-y-1.5">
            <h1 className="sr-only">Products</h1>
            {headerActions ? (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {headerActions}
              </div>
            ) : null}
            {headerExtra}
          </header>
        ) : (
          <h1 className="sr-only">Products</h1>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
