"use client";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function BusinessHubSkeleton() {
  return (
    <div className="hub-paper mx-auto w-full max-w-5xl space-y-3 p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:p-4 2xl:pb-16">
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
      <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="h-44 border border-[#E6E1D8] bg-white animate-pulse" />
        <div className="h-44 border border-[#E6E1D8] bg-white animate-pulse" />
      </div>
    </div>
  );
}
