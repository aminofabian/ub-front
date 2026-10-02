"use client";

import type { ReactNode } from "react";

import { ProductsHubNav } from "@/components/products/products-hub-nav";
import { cn } from "@/lib/utils";
import { CATALOG_SURFACE } from "./catalog-chrome";

export const PRODUCTS_CATALOG_VARS = {
  ["--catalog-primary" as string]: "#0f766e",
  ["--catalog-ink" as string]: "#15231f",
  ["--catalog-shelf" as string]: "#ffffff",
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
        "catalog-paper relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col px-0 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-0 sm:px-4 sm:pb-4 sm:pt-2.5",
        className,
      )}
      style={PRODUCTS_CATALOG_VARS}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-white max-lg:hidden"
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-0 sm:gap-2">
        <div className={cn("shrink-0 p-0.5 max-lg:border-b max-lg:border-border max-lg:px-1 max-lg:py-1", CATALOG_SURFACE)}>
          <ProductsHubNav />
        </div>

        {showToolbar ? (
          <header className="shrink-0 space-y-1.5">
            <h1 className="sr-only">Products</h1>
            {headerActions ? (
              <div className="flex min-w-0 items-center gap-2">
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
