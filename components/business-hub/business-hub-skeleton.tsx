"use client";

import { BusinessPageLayout } from "@/components/business-hub/business-page-layout";
import { HUB_SURFACE } from "@/lib/business-hub/constants";

export function BusinessHubSkeleton() {
  return (
    <BusinessPageLayout>
      <div className="mx-auto w-full max-w-6xl xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] xl:gap-4">
        <div className="flex flex-col gap-2.5 xl:pr-2">
          <div className={`${HUB_SURFACE} h-10 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)]`} />
          <div className={`${HUB_SURFACE} grid animate-pulse lg:grid-cols-2`}>
            <div className="space-y-2 border-b border-[color-mix(in_srgb,#141414_8%,transparent)] px-4 py-3.5 lg:border-b-0 lg:border-r">
              <div className="h-2.5 w-28 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,white)]" />
              <div className="h-8 w-40 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,white)]" />
              <div className="h-3 w-full max-w-xs bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,white)]" />
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-[color-mix(in_srgb,#141414_8%,transparent)] sm:grid-cols-4 sm:divide-y-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5 px-3 py-3">
                  <div className="h-2.5 w-14 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,white)]" />
                  <div className="h-4 w-16 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,white)]" />
                </div>
              ))}
            </div>
          </div>
          <div className={`${HUB_SURFACE} h-20 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)]`} />
          <div
            className={`${HUB_SURFACE} grid grid-cols-3 divide-x divide-[color-mix(in_srgb,#141414_8%,transparent)]`}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="hidden max-h-[min(40rem,72dvh)] space-y-3 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-3 shadow-none xl:block">
          <div className="h-8 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,white)]" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="space-y-2 border-t border-[color-mix(in_srgb,#141414_8%,transparent)] pt-3"
            >
              <div className="h-3 w-24 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,white)]" />
              <div className="h-3 w-full animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,white)]" />
              <div className="h-3 w-2/3 animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,white)]" />
            </div>
          ))}
        </div>
      </div>
    </BusinessPageLayout>
  );
}
