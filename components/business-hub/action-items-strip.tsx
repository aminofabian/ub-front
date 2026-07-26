"use client";

import Link from "next/link";
import { ArrowRight, AlertTriangle, Info } from "lucide-react";

import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
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
    <section className="hub-rise hub-rise-delay-2 space-y-2">
      <HubSectionLabel
        index="03"
        title="Needs attention"
        meta={
          items.length === 1
            ? "One thing to clear"
            : `${items.length} items · clear before reports`
        }
      />
      <div
        className={cn(
          "grid gap-px border border-[#E6E1D8] bg-[#E6E1D8]",
          items.length === 1 && "grid-cols-1",
          items.length === 2 && "sm:grid-cols-2",
          items.length >= 3 && "sm:grid-cols-2 lg:grid-cols-3",
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
                "group relative flex items-center gap-2.5 overflow-hidden border-0 px-3 py-2.5 transition-colors hover:bg-[#FCFAF6]",
              )}
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 w-0.5",
                  item.tone === "warning" ? "bg-[#C47A5A]" : "bg-[#B08D48]",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "ml-1 flex size-7 shrink-0 items-center justify-center",
                  item.tone === "warning"
                    ? "bg-[#C47A5A]/10 text-[#C47A5A]"
                    : "bg-[#F9F6F0] text-[#B08D48]",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#141414]">
                  {item.label}
                </span>
                {item.detail ? (
                  <span className="mt-0.5 block truncate text-[11px] text-[#888888]">
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <ArrowRight
                className="size-3.5 shrink-0 text-[#DDDDDD] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#B08D48]"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
