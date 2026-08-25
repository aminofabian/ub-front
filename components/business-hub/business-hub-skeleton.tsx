"use client";

export function BusinessHubSkeleton() {
  return (
    <div className="hub-paper mx-auto w-full max-w-5xl px-3 py-2 sm:px-4">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 animate-pulse bg-[#EDE8DF]" />
        <div className="h-7 w-40 animate-pulse bg-[#F0EBE3]" />
        <div className="flex gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-2.5 w-12 animate-pulse bg-[#EDE8DF]" />
              <div className="h-4 w-16 animate-pulse bg-[#E6E1D8]" />
            </div>
          ))}
        </div>
        <div className="h-7 w-full animate-pulse bg-[#F7F5F1]" />
      </div>
    </div>
  );
}
