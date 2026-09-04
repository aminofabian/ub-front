"use client";

import type { ReactNode } from "react";

import { ProductsHubNav } from "@/components/products/products-hub-nav";
import { cn } from "@/lib/utils";
import { CATALOG_SURFACE } from "./catalog-chrome";

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
        "catalog-paper relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col px-2 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-2.5",
        className,
      )}
      style={PRODUCTS_CATALOG_VARS}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(110%_90%_at_8%_-18%,color-mix(in_srgb,var(--catalog-primary)_10%,transparent),transparent_58%),linear-gradient(180deg,color-mix(in_srgb,var(--catalog-shelf)_90%,#fff),transparent_72%)]"
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-2">
        <div className={cn("shrink-0 p-0.5", CATALOG_SURFACE)}>
          <ProductsHubNav />
        </div>

        {showToolbar ? (
          <header className="shrink-0 space-y-1.5">
            <h1 className="sr-only">Products</h1>
            {headerActions ? (
              <div className="flex min-w-0 items-center gap-2">{headerActions}</div>
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
