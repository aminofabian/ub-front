"use client";

import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import { cn } from "@/lib/utils";

export type ActionItem = {
  id: string;
  label: string;
  detail?: string;
  href: string;
  tone?: "warning" | "info";
};

export function ActionItemsStrip({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-1.5">
      <HubSectionLabel
        title="Needs attention"
        meta={String(items.length)}
        className="px-0.5"
      />
      {/* Phone: 2-up tile grid. Desk: horizontal strip. */}
      <div
        className={cn(
          HUB_SURFACE,
          "grid grid-cols-2 gap-px bg-[color-mix(in_srgb,#141414_8%,transparent)] p-px",
          "sm:flex sm:snap-x sm:snap-mandatory sm:gap-0 sm:overflow-x-auto sm:bg-transparent sm:p-0",
          "sm:divide-x sm:divide-[color-mix(in_srgb,#141414_8%,transparent)]",
          "sm:[-ms-overflow-style:none] sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden",
        )}
      >
        {items.map((item) => {
          const Icon = item.tone === "info" ? Info : AlertTriangle;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "group flex min-h-[3.25rem] flex-col justify-center gap-1 bg-white px-2.5 py-2 transition-colors",
                "active:bg-[color-mix(in_srgb,#0f766e_6%,white)]",
                "hover:bg-[color-mix(in_srgb,#141414_2.5%,white)]",
                "sm:min-h-0 sm:min-w-0 sm:flex-1 sm:snap-start sm:flex-row sm:items-center sm:gap-2 sm:py-1.5",
              )}
            >
              <span className="flex items-center gap-1.5">
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    item.tone === "warning" ? "text-[#C47A5A]" : "text-[#0f766e]",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-snug tracking-[-0.015em] text-[#141414] sm:text-[12px] sm:font-medium">
                  {item.label}
                </span>
              </span>
              {item.detail ? (
                <span className="truncate pl-5 text-[10px] text-[#8A8A8A] sm:hidden">
                  {item.detail}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
