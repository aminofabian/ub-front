"use client";

import { cn } from "@/lib/utils";

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
        "inline-flex max-w-full flex-wrap gap-0.5 rounded-lg border border-[#E6E1D8]/90 bg-white p-0.5 shadow-[0_1px_0_rgba(20,20,20,0.04)]",
        className,
      )}
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#666666] transition-colors hover:bg-[#F7F5F1] hover:text-[#141414]"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
