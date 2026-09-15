"use client";

import { BusinessPageLayout } from "@/components/business-hub/business-page-layout";
import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

const BLOCK = "animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,white)]";

/**
 * Mirrors the shipped composition — summary panel, attention queue, shortcut
 * board, open work — so the first paint does not reflow when the data lands.
 */
export function BusinessHubSkeleton() {
  return (
    <BusinessPageLayout>
      <div className="mx-auto w-full max-w-6xl xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] xl:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4 xl:pr-2">
          {/* Summary */}
          <div className="space-y-1.5">
            <div className={cn(BLOCK, "h-3 w-24")} />
            <div className={cn(HUB_SURFACE)}>
              <div className="border-b border-[color-mix(in_srgb,#141414_8%,transparent)] px-3 py-3 sm:px-4">
                <div className={cn(BLOCK, "h-2.5 w-24")} />
                <div className={cn(BLOCK, "mt-2 h-7 w-40")} />
                <div className={cn(BLOCK, "mt-2 h-5 w-full max-w-xs")} />
              </div>
              <div className="grid grid-cols-2 gap-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] sm:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-h-[3.75rem] space-y-1.5 bg-white px-3 py-2.5"
                  >
                    <div className={cn(BLOCK, "h-2.5 w-14")} />
                    <div className={cn(BLOCK, "h-4 w-16")} />
                  </div>
                ))}
              </div>
              <div className="border-t border-[color-mix(in_srgb,#141414_8%,transparent)] px-3 py-2">
                <div className={cn(BLOCK, "h-8 w-full")} />
              </div>
            </div>
          </div>

          {/* Attention */}
          <div className="space-y-1.5">
            <div className={cn(BLOCK, "h-3 w-32")} />
            <div className={cn(HUB_SURFACE, "grid gap-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] sm:grid-cols-2")}>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="min-h-12 bg-white px-3 py-2.5">
                  <div className={cn(BLOCK, "h-2.5 w-28")} />
                  <div className={cn(BLOCK, "mt-1.5 h-2.5 w-20")} />
                </div>
              ))}
            </div>
          </div>

          {/* Jump in */}
          <div className="space-y-1.5">
            <div className={cn(BLOCK, "h-3 w-20")} />
            <div
              className={cn(
                HUB_SURFACE,
                "grid grid-cols-3 gap-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] sm:grid-cols-4 xl:grid-cols-6",
              )}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex min-h-[4.75rem] flex-col justify-between gap-2 bg-white p-2.5"
                >
                  <div className={cn(BLOCK, "size-7")} />
                  <div className={cn(BLOCK, "h-2.5 w-14")} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Desk-only lane rail */}
        <div className="hidden max-h-[min(40rem,72dvh)] space-y-3 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-3 shadow-none xl:block">
          <div className={cn(BLOCK, "h-8")} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="space-y-2 border-t border-[color-mix(in_srgb,#141414_8%,transparent)] pt-3"
            >
              <div className={cn(BLOCK, "h-3 w-24")} />
              <div className={cn(BLOCK, "h-3 w-full")} />
              <div className={cn(BLOCK, "h-3 w-2/3")} />
            </div>
          ))}
        </div>
      </div>
    </BusinessPageLayout>
  );
}
