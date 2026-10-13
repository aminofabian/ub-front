"use client";

import type { ReactNode } from "react";

import { HUB_MUTED, HUB_SECTION } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

/**
 * The one heading language for a hub section: an accent tick, the title, a
 * hairline that carries the eye across to the trailing meta/control. Every
 * section uses this so the page reads as one grouped list instead of a stack
 * of competing labels.
 */
export function HubSectionLabel({
  title,
  meta,
  action,
  rule = true,
  className,
}: {
  /** @deprecated Section numbers removed for quieter headings. */
  index?: string;
  title: string;
  meta?: string;
  /** Optional trailing control (count, link) shown beside the meta. */
  action?: ReactNode;
  /** Draw the hairline between the title and its meta. */
  rule?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <h2
        className={cn(
          HUB_SECTION,
          "min-w-0 before:block before:h-px before:w-3 before:shrink-0 before:bg-[#0f766e] before:content-['']",
        )}
      >
        {title}
      </h2>
      {rule ? (
        <span
          className="h-px min-w-3 flex-1 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]"
          aria-hidden
        />
      ) : (
        <span className="flex-1" aria-hidden />
      )}
      {meta || action ? (
        <div className="flex shrink-0 items-center gap-2">
          {meta ? (
            <p className={cn("text-[11px] tabular-nums", HUB_MUTED)}>{meta}</p>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
