"use client";

import { Suspense } from "react";

import { StockLevelsPage } from "@/components/inventory/stock-levels-page";

function StockPageFallback() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-2 py-6 sm:px-3">
      <div className="h-8 w-40 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]" />
      <div className="mt-4 h-24 w-full animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]" />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="h-20 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]" />
        <div className="h-20 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)]" />
      </div>
    </div>
  );
}

export default function InventoryStockPage() {
  return (
    <Suspense fallback={<StockPageFallback />}>
      <StockLevelsPage />
    </Suspense>
  );
}
