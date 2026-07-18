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
    <section className="space-y-3">
      <div>
        <h2 className={cn("text-sm font-medium", HUB_MUTED)}>Needs attention</h2>
        <p className="mt-1 text-sm text-[#666666]">
          {items.length === 1
            ? "One thing to clear before the day runs away."
            : `${items.length} things worth a look before you dig into reports.`}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.tone === "info" ? Info : AlertTriangle;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                HUB_SURFACE,
                "group flex items-start gap-3 px-4 py-4 transition-colors hover:border-[#E8DFD0]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                  item.tone === "warning"
                    ? "bg-[#C47A5A]/10 text-[#C47A5A]"
                    : "bg-[#F9F6F0] text-[#B08D48]",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-black">
                  {item.label}
                </span>
                {item.detail ? (
                  <span className="mt-0.5 block text-xs leading-relaxed text-[#888888]">
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <ArrowRight
                className="mt-1 size-4 shrink-0 text-[#DDDDDD] transition-colors group-hover:text-[#B08D48]"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
