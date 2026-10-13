"use client";

import type { ReactNode } from "react";

import { HUB_SECTION } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

/**
 * The one heading language for a hub section: a plain bold title with an
 * optional count/control on the right. Quiet by design — the cards do the
 * separating, so headings don't need rules or ticks.
 */
export function HubSectionLabel({
  title,
  meta,
  action,
  className,
}: {
  /** @deprecated Section numbers removed for quieter headings. */
  index?: string;
  title: string;
  meta?: string;
  /** Optional trailing control (count, link) shown beside the meta. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className={cn(HUB_SECTION, "min-w-0 truncate")}>{title}</h2>
      {meta || action ? (
        <div className="flex shrink-0 items-center gap-2">
          {meta ? (
            <p className="text-[12px] tabular-nums text-[#98a2b3]">{meta}</p>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
