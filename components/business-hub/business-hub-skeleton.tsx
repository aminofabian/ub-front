"use client";

import { BusinessPageLayout } from "@/components/business-hub/business-page-layout";
import { HUB_SURFACE } from "@/lib/business-hub/constants";

export function BusinessHubSkeleton() {
  return (
    <BusinessPageLayout>
      <div className="mx-auto w-full max-w-6xl xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] xl:gap-4">
        <div className="flex flex-col gap-3 xl:pr-2">
          <div className={`${HUB_SURFACE} h-14 animate-pulse bg-[#F7F5F1]`} />
          <div className={`${HUB_SURFACE} grid animate-pulse lg:grid-cols-2`}>
            <div className="space-y-2 border-b border-[#E6E1D8] px-4 py-3.5 lg:border-b-0 lg:border-r">
              <div className="h-2.5 w-28 rounded bg-[#EDE8DF]" />
              <div className="h-8 w-40 rounded bg-[#E6E1D8]" />
              <div className="h-3 w-full max-w-xs rounded bg-[#F0EBE3]" />
            </div>
            <div className="grid grid-cols-2 gap-px bg-[#E6E1D8]/80 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5 bg-white px-3 py-3">
                  <div className="h-2.5 w-14 rounded bg-[#EDE8DF]" />
                  <div className="h-4 w-16 rounded bg-[#E6E1D8]" />
                </div>
              ))}
            </div>
          </div>
          <div className={`${HUB_SURFACE} h-24 animate-pulse bg-[#F7F5F1]`} />
          <div className={`${HUB_SURFACE} grid grid-cols-3 gap-px overflow-hidden bg-[#E6E1D8]/80`}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse bg-white" />
            ))}
          </div>
          <div className={`${HUB_SURFACE} grid grid-cols-4 gap-px overflow-hidden bg-[#E6E1D8]/80`}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-white" />
            ))}
          </div>
        </div>
        <div className="hidden max-h-[min(40rem,72dvh)] space-y-3 rounded-xl border border-[#E6E1D8]/90 bg-[#FCFAF6] p-3 shadow-[0_1px_0_rgba(20,20,20,0.04),0_10px_32px_-20px_rgba(20,20,20,0.12)] xl:block">
          <div className="h-10 animate-pulse rounded bg-[#EDE8DF]" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 border-t border-[#EDE8DF] pt-3">
              <div className="h-3 w-24 animate-pulse rounded bg-[#E6E1D8]" />
              <div className="h-3 w-full animate-pulse rounded bg-[#F0EBE3]" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-[#F0EBE3]" />
            </div>
          ))}
        </div>
      </div>
    </BusinessPageLayout>
  );
}
