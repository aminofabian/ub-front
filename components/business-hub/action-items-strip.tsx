"use client";

import Link from "next/link";
import { ArrowRight, AlertTriangle, Info } from "lucide-react";

import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
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
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 className={cn("text-xs font-medium uppercase tracking-[0.08em]", HUB_MUTED)}>
          Needs attention
        </h2>
        <p className="text-[11px] text-[#888888]">
          {items.length === 1
            ? "One thing to clear"
            : `${items.length} items · clear before reports`}
        </p>
      </div>
      <div
        className={cn(
          "grid gap-px border border-[#EEEEEE] bg-[#EEEEEE]",
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
                "group flex items-center gap-2.5 border-0 px-3 py-2 transition-colors hover:bg-[#FCFBF8]",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center",
                  item.tone === "warning"
                    ? "bg-[#C47A5A]/10 text-[#C47A5A]"
                    : "bg-[#F9F6F0] text-[#B08D48]",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-black">
                  {item.label}
                </span>
                {item.detail ? (
                  <span className="mt-0.5 block truncate text-[11px] text-[#888888]">
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <ArrowRight
                className="size-3.5 shrink-0 text-[#DDDDDD] transition-colors group-hover:text-[#B08D48]"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
