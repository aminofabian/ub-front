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
        "inline-flex max-w-full flex-wrap gap-0.5 rounded-xl bg-white p-0.5 ring-1 ring-[color-mix(in_srgb,#141414_7%,transparent)]",
        className,
      )}
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#666666] transition-colors hover:bg-[#F7F5F1] hover:text-[#141414]"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
