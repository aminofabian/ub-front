"use client";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function BusinessHubSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:space-y-10 2xl:pb-20 animate-in fade-in duration-500">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-md bg-[#EEEEEE] animate-pulse" />
          <div className="h-4 w-40 max-w-full rounded-md bg-[#EEEEEE] animate-pulse" />
        </div>
        <div className="h-10 w-52 shrink-0 rounded-lg bg-[#EEEEEE] animate-pulse" />
      </header>

      <div className={cn(HUB_SURFACE, "space-y-6 px-5 py-6 sm:px-8 sm:py-8")}>
        <div className="h-3 w-28 rounded bg-[#EEEEEE] animate-pulse" />
        <div className="h-14 w-64 max-w-full rounded bg-[#EEEEEE] animate-pulse" />
        <div className="h-4 w-full max-w-xl rounded bg-[#EEEEEE] animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg border border-[#F0EBE3] bg-[#FCFBF8] animate-pulse"
            />
          ))}
        </div>
      </div>

      <div className="h-64 rounded-xl bg-[#EEEEEE] animate-pulse" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-[#EEEEEE] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
