"use client";

import { HUB_CARD } from "@/lib/business-hub/constants";

export function BusinessHubSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:space-y-8 2xl:pb-20 animate-in fade-in duration-500">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-md bg-[#EEEEEE] animate-pulse" />
          <div className="h-4 w-48 max-w-full rounded-md bg-[#EEEEEE] animate-pulse" />
        </div>
        <div className="h-10 w-52 shrink-0 rounded-lg bg-[#EEEEEE] animate-pulse" />
      </header>
      <div className="space-y-4">
        <div className="h-4 w-28 rounded bg-[#EEEEEE] animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={HUB_CARD}>
              <div className="h-3 w-24 rounded bg-[#EEEEEE] animate-pulse" />
              <div className="mt-4 h-8 w-32 rounded bg-[#EEEEEE] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-52 rounded-xl bg-[#EEEEEE] animate-pulse" />
    </div>
  );
}
