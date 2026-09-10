"use client";

import Link from "next/link";
import { ArrowRight, AlertTriangle, Info } from "lucide-react";

import { HUB_SECTION, HUB_SURFACE } from "@/lib/business-hub/constants";
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
    <section className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className={HUB_SECTION}>Needs attention</h2>
        <p className="text-[11px] tabular-nums text-[#AAAAAA]">
          {items.length}
        </p>
      </div>
      <div
        className={cn(
          HUB_SURFACE,
          "flex flex-col divide-y divide-[color-mix(in_srgb,#141414_8%,transparent)]",
          "sm:flex-row sm:snap-x sm:snap-mandatory sm:overflow-x-auto sm:divide-x sm:divide-y-0",
          "sm:[-ms-overflow-style:none] sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden",
        )}
      >
        {items.map((item) => {
          const Icon = item.tone === "info" ? Info : AlertTriangle;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="group flex min-h-11 items-center gap-2 px-2.5 py-2.5 transition-colors hover:bg-white sm:min-h-0 sm:min-w-0 sm:flex-1 sm:snap-start sm:py-1.5"
            >
              <Icon
                className={cn(
                  "size-3.5 shrink-0 sm:size-3",
                  item.tone === "warning" ? "text-[#C47A5A]" : "text-[#0f766e]",
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#141414] sm:text-[12px]">
                {item.label}
              </span>
              <ArrowRight
                className="size-3.5 shrink-0 text-[#8A8A8A] group-hover:text-[#0f766e] sm:size-3"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
