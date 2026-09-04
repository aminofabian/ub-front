"use client";

import { HUB_MUTED, HUB_SECTION } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function HubSectionLabel({
  title,
  meta,
  className,
}: {
  /** @deprecated Section numbers removed for quieter headings. */
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
      <h2 className={HUB_SECTION}>{title}</h2>
      {meta ? (
        <p className={cn("text-[12px] tabular-nums", HUB_MUTED)}>{meta}</p>
      ) : null}
    </div>
  );
}
