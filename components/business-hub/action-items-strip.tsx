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
    <section className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={HUB_SECTION}>Needs attention</h2>
        <p className="text-[11px] tabular-nums text-[#AAAAAA]">{items.length}</p>
      </div>
      <div
        className={cn(
          HUB_SURFACE,
          "flex flex-wrap items-stretch divide-y divide-[color-mix(in_srgb,#141414_8%,transparent)] sm:divide-x sm:divide-y-0",
        )}
      >
        {items.map((item) => {
          const Icon = item.tone === "info" ? Info : AlertTriangle;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="group flex min-w-0 flex-1 basis-full items-center gap-2 px-3 py-1.5 transition-colors hover:bg-[#FAF8F3] sm:basis-0"
            >
              <Icon
                className={cn(
                  "size-3 shrink-0",
                  item.tone === "warning" ? "text-[#C47A5A]" : "text-[#B08D48]",
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#141414]">
                {item.label}
              </span>
              <ArrowRight
                className="size-3 shrink-0 text-[#D4CBB8] group-hover:text-[#B08D48]"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
