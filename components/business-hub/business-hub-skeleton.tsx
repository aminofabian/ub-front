"use client";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function BusinessHubSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] 2xl:pb-16 animate-in fade-in duration-500">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="h-6 w-48 bg-[#EEEEEE] animate-pulse" />
          <div className="h-3.5 w-36 max-w-full bg-[#EEEEEE] animate-pulse" />
        </div>
        <div className="h-8 w-44 shrink-0 bg-[#EEEEEE] animate-pulse" />
      </header>

      <div className={cn(HUB_SURFACE, "space-y-3 px-3.5 py-3 sm:px-4")}>
        <div className="h-2.5 w-24 bg-[#EEEEEE] animate-pulse" />
        <div className="h-10 w-52 max-w-full bg-[#EEEEEE] animate-pulse" />
        <div className="h-3.5 w-full max-w-xl bg-[#EEEEEE] animate-pulse" />
        <div className="grid gap-px border border-[#F0EBE3] bg-[#F0EBE3] sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white animate-pulse" />
          ))}
        </div>
      </div>

      <div className="h-36 border border-[#EEEEEE] bg-[#EEEEEE] animate-pulse" />
      <div className="grid gap-px border border-[#EEEEEE] bg-[#EEEEEE] sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-white animate-pulse" />
        ))}
      </div>
    </div>
  );
}
