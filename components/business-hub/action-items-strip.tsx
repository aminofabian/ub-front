"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, Info } from "lucide-react";

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

const CELL_DIVIDE = "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]";
const CELL_FILL = "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]";

/**
 * The queue: what the shop needs a human to look at. One tap target per line on
 * a phone, two across once there is room — never a horizontal scroll, so the
 * whole queue is visible without swiping.
 */
export function ActionItemsStrip({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return null;
  }

  const fillers = items.length % 2;

  return (
    <section className="space-y-1.5">
      <HubSectionLabel
        title="Needs attention"
        meta={`${items.length} to review`}
        className="px-0.5"
      />
      <div
        className={cn(
          HUB_SURFACE,
          "grid grid-cols-1 gap-px sm:grid-cols-2",
          CELL_DIVIDE,
        )}
      >
        {items.map((item) => {
          const Icon = item.tone === "info" ? Info : AlertTriangle;
          const warning = item.tone !== "info";
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "group flex min-h-12 items-center gap-3 bg-white px-3 py-2.5 transition-colors",
                "hover:bg-[color-mix(in_srgb,#141414_2.5%,white)]",
                "active:bg-[color-mix(in_srgb,#0f766e_6%,white)]",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f766e]/45",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center border bg-white",
                  warning
                    ? "border-[#C47A5A]/35 text-[#C47A5A]"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[#0f766e]",
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
              <ChevronRight
                className="size-4 shrink-0 text-[#C8C2B6] transition-colors group-hover:text-[#0f766e]"
                aria-hidden
              />
            </Link>
          );
        })}
        {fillers > 0 ? (
          <span aria-hidden className={cn("hidden sm:block", CELL_FILL)} />
        ) : null}
      </div>
    </section>
  );
}
