"use client";

import { cn } from "@/lib/utils";
import { HUB_BTN } from "@/lib/business-hub/constants";

export function HubSettingsSectionNav({
  items,
  className,
  ariaLabel = "Page sections",
}: {
  items: { id: string; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full flex-wrap gap-0.5 rounded-none border border-[color-mix(in_srgb,#141414_9%,transparent)] bg-white p-0.5",
        className,
      )}
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            HUB_BTN,
            "px-3 py-1.5 text-[12px] font-medium text-[#666666] hover:border-[#0f766e] hover:text-[#0f766e]",
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
