"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Info } from "lucide-react";

import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import { cn } from "@/lib/utils";

export type ActionItem = {
  id: string;
  label: string;
  detail?: string;
  href: string;
  tone?: "warning" | "info";
};

const TONES = {
  warning: {
    card: "bg-[#fdf8f0] hover:bg-[#fcf3e6]",
    icon: "bg-[#fbe8cf] text-[#b45309]",
    arrow: "text-[#b45309]",
  },
  info: {
    card: "bg-[#f0f9f7] hover:bg-[#e6f4f1]",
    icon: "bg-[#d9f0eb] text-[#0f766e]",
    arrow: "text-[#0f766e]",
  },
} as const;

/** The queue: what the shop needs a human to look at, one card per job. */
export function ActionItemsStrip({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <HubSectionLabel
        title="Needs attention"
        meta={`${items.length} to review`}
        className="px-0.5"
      />
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const tone = TONES[item.tone === "info" ? "info" : "warning"];
          const Icon = item.tone === "info" ? Info : AlertTriangle;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "group flex min-h-12 items-center gap-2 rounded-2xl px-3 py-2.5 transition-colors",
                "ring-1 ring-black/[0.05]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/45",
                tone.card,
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-none",
                  tone.icon,
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="line-clamp-2 text-[12px] font-semibold tracking-[-0.015em] text-[#141414]">
                  {item.label}
                </span>
                {item.detail ? (
                  <span className="mt-0.5 block truncate text-[10px] text-[#6F6F6F]">
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <ArrowRight
                className={cn(
                  "hidden size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 sm:block",
                  tone.arrow,
                )}
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
