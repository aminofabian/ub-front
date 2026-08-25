"use client";

import Link from "next/link";
import { ArrowRight, AlertTriangle, Info } from "lucide-react";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
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
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-semibold tracking-tight text-[#141414]">
          Needs a look
        </h2>
        <p className="text-[11px] text-[#AAAAAA]">{items.length}</p>
      </div>
      <div
        className={cn(
          "grid gap-px border border-[#E6E1D8] bg-[#E6E1D8]",
          items.length === 1 && "grid-cols-1",
          items.length === 2 && "grid-cols-2",
          items.length >= 3 && "grid-cols-3",
        )}
      >
        {items.map((item) => {
          const Icon = item.tone === "info" ? Info : AlertTriangle;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                HUB_SURFACE,
                "group relative flex items-center gap-2 overflow-hidden border-0 px-3 py-2.5 transition-colors hover:bg-[#FCFAF6]",
              )}
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 w-0.5",
                  item.tone === "warning" ? "bg-[#C47A5A]" : "bg-[#B08D48]",
                )}
                aria-hidden
              />
              <Icon
                className={cn(
                  "ml-1 size-3.5 shrink-0",
                  item.tone === "warning" ? "text-[#C47A5A]" : "text-[#B08D48]",
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#141414]">
                {item.label}
              </span>
              <ArrowRight
                className="size-3.5 shrink-0 text-[#DDDDDD] group-hover:text-[#B08D48]"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
