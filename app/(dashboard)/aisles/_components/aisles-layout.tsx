"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const AISLES_VARS = {
  ["--aisle-primary" as string]: "#0d9488",
  ["--aisle-ink" as string]: "#142824",
  ["--aisle-paper" as string]: "#eef5f3",
  ["--aisle-slip" as string]: "#fafcfb",
  ["--aisle-grid" as string]: "#b8d4ce",
} as const;

export function AislesLayout({
  children,
  header,
  className,
}: {
  children: ReactNode;
  header: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto flex h-full min-h-0 w-full max-w-[1280px] flex-col px-2 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3",
        className,
      )}
      style={AISLES_VARS}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(90%_80%_at_8%_-10%,color-mix(in_srgb,var(--aisle-primary)_16%,transparent),transparent_55%),linear-gradient(180deg,color-mix(in_srgb,var(--aisle-paper)_90%,#fff),transparent)]"
      />
      <div className="relative flex min-h-0 flex-1 flex-col gap-3">
        {header}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
