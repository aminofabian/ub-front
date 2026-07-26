"use client";

import { HUB_SURFACE } from "@/lib/business-hub/constants";

export function BusinessHubSkeleton() {
  return (
    <div className="hub-paper mx-auto flex h-[calc(100dvh-5.5rem)] w-full max-w-6xl flex-col gap-1.5 overflow-hidden p-2 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(220px,260px)] xl:gap-0">
      <div className="flex min-h-0 flex-col gap-1.5 xl:border-r xl:border-[#E6E1D8] xl:pr-2.5">
        <div className={`${HUB_SURFACE} h-10 animate-pulse bg-[#F7F5F1]`} />
        <div className="flex items-center justify-between border-b border-[#E6E1D8] pb-1.5">
          <div className="space-y-1">
            <div className="h-5 w-48 animate-pulse bg-[#EDE8DF]" />
            <div className="h-2.5 w-64 animate-pulse bg-[#F0EBE3]" />
          </div>
          <div className="h-7 w-28 animate-pulse bg-[#EDE8DF]" />
        </div>
        <div className={`${HUB_SURFACE} grid animate-pulse lg:grid-cols-2`}>
          <div className="space-y-2 border-b border-[#E6E1D8] px-3 py-2.5 lg:border-b-0 lg:border-r">
            <div className="h-2.5 w-24 bg-[#EDE8DF]" />
            <div className="h-7 w-36 bg-[#E6E1D8]" />
            <div className="h-2.5 w-full max-w-xs bg-[#F0EBE3]" />
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#E6E1D8] sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1 bg-white px-2.5 py-2">
                <div className="h-2 w-12 bg-[#EDE8DF]" />
                <div className="h-4 w-16 bg-[#E6E1D8]" />
              </div>
            ))}
          </div>
        </div>
        <div className={`${HUB_SURFACE} h-[4.5rem] animate-pulse bg-[#F7F5F1]`} />
        <div className="grid grid-cols-3 gap-px border border-[#E6E1D8] bg-[#E6E1D8]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse bg-white" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-px border border-[#E6E1D8] bg-[#E6E1D8]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse bg-white" />
          ))}
        </div>
      </div>
      <div className="hidden h-full space-y-2 border-l border-[#E6E1D8] bg-[#FCFAF6] p-2 xl:block">
        <div className="h-8 animate-pulse bg-[#EDE8DF]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1 border-t border-[#EDE8DF] pt-2">
            <div className="h-3 w-20 animate-pulse bg-[#E6E1D8]" />
            <div className="h-3 w-full animate-pulse bg-[#F0EBE3]" />
            <div className="h-3 w-2/3 animate-pulse bg-[#F0EBE3]" />
          </div>
        ))}
      </div>
    </div>
  );
}
