"use client";

import { HUB_MUTED } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function HubSectionLabel({
  index,
  title,
  meta,
  className,
}: {
  index?: string;
  title: string;
  meta?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5",
        className,
      )}
    >
      <div className="flex min-w-0 items-baseline gap-2">
        {index ? (
          <span
            className="font-mono text-[10px] font-medium tabular-nums text-[#B08D48]"
            aria-hidden
          >
            {index}
          </span>
        ) : null}
        <h2
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.14em]",
            HUB_MUTED,
          )}
        >
          {title}
        </h2>
      </div>
      {meta ? (
        <p className="text-[11px] tabular-nums text-[#9A9A9A]">{meta}</p>
      ) : null}
    </div>
  );
}
