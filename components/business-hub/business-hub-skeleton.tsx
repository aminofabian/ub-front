"use client";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function BusinessHubSkeleton() {
  return (
    <div className="hub-paper mx-auto w-full max-w-6xl space-y-3 p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:p-4 2xl:pb-16 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] xl:items-start xl:gap-0 xl:space-y-0">
      <div className="space-y-3 xl:border-r xl:border-[#E6E1D8] xl:pr-3">
        <header className="flex items-start justify-between gap-3 border-b border-[#E6E1D8] pb-3">
          <div className="space-y-2">
            <div className="h-6 w-28 bg-[#E6E1D8] animate-pulse" />
            <div className="h-3.5 w-40 max-w-full bg-[#E6E1D8] animate-pulse" />
          </div>
          <div className="h-8 w-36 shrink-0 bg-[#E6E1D8] animate-pulse" />
        </header>

        <div className={cn(HUB_SURFACE, "grid lg:grid-cols-2")}>
          <div className="space-y-3 border-b border-[#E6E1D8] px-4 py-4 lg:border-b-0 lg:border-r">
            <div className="h-2.5 w-28 bg-[#E6E1D8] animate-pulse" />
            <div className="h-12 w-48 max-w-full bg-[#E6E1D8] animate-pulse" />
            <div className="h-3.5 w-full max-w-sm bg-[#E6E1D8] animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#E6E1D8]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-white animate-pulse" />
            ))}
          </div>
        </div>

        <div className="h-40 border border-[#E6E1D8] bg-white animate-pulse" />
      </div>

      <div className="hidden h-[100dvh] space-y-3 border-l border-[#E6E1D8] bg-[#FCFAF6] p-3 xl:block">
        <div className="h-2.5 w-20 bg-[#E6E1D8] animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5 border-t border-[#EDE8DF] pt-2">
            <div className="h-2 w-16 bg-[#E6E1D8] animate-pulse" />
            <div className="h-3 w-28 bg-[#E6E1D8] animate-pulse" />
            <div className="h-3 w-24 bg-[#E6E1D8] animate-pulse" />
            <div className="h-3 w-20 bg-[#E6E1D8] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
