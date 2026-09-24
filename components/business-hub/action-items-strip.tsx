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
    card: "border-[#F1D9B8] bg-[#FDF8F0] hover:bg-[#FCF3E6]",
    icon: "bg-[#FBEBD2] text-[#B45309]",
    arrow: "text-[#B45309]",
  },
  info: {
    card: "border-[#CCE6E2] bg-[#F1F9F8] hover:bg-[#E7F4F2]",
    icon: "bg-[#D6EDEA] text-[#0f766e]",
    arrow: "text-[#0f766e]",
  },
} as const;

/** The queue: what the shop needs a human to look at, one card per job. */
export function ActionItemsStrip({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <HubSectionLabel
        title="Needs attention"
        meta={`${items.length} to review`}
        className="px-0.5"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const tone = TONES[item.tone === "info" ? "info" : "warning"];
          const Icon = item.tone === "info" ? Info : AlertTriangle;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "group flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/45",
                tone.card,
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  tone.icon,
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold leading-snug tracking-[-0.015em] text-[#141414]">
                  {item.label}
                </span>
                {item.detail ? (
                  <span className="mt-0.5 block truncate text-[11px] leading-snug text-[#6F6F6F]">
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <ArrowRight
                className={cn(
                  "size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100",
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
