"use client";

import type { ReactNode } from "react";

import { HUB_MUTED, HUB_SECTION } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

/**
 * The one heading language for a hub section: an accent tick, the title,
 * then optional trailing meta/controls. Every section uses this so the
 * page reads with a single rhythm instead of several competing label styles.
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
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5",
        className,
      )}
    >
      <h2
        className={cn(
          HUB_SECTION,
          "before:block before:h-px before:w-3 before:shrink-0 before:bg-[#0f766e] before:content-['']",
        )}
      >
        {title}
      </h2>
      {meta || action ? (
        <div className="flex shrink-0 items-baseline gap-2">
          {meta ? (
            <p className={cn("text-[11px] tabular-nums", HUB_MUTED)}>{meta}</p>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
