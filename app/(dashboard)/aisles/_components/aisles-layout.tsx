"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const AISLES_VARS = {
  ["--aisle-primary" as string]: "#0f766e",
  ["--aisle-ink" as string]: "#15231f",
  ["--aisle-paper" as string]: "#ffffff",
  ["--aisle-slip" as string]: "#ffffff",
  ["--aisle-grid" as string]: "#d7e4e1",
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
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-white"
      />
      <div className="relative flex min-h-0 flex-1 flex-col gap-3">
        {header}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
