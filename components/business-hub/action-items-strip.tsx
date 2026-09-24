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
 * The queue: what the shop needs a human to look at.
 * - `board`: two across once there is room (main column).
 * - `rail`: single stacked column for the live-sales side rail.
 */
export function ActionItemsStrip({
  items,
  density = "board",
}: {
  items: ActionItem[];
  density?: "board" | "rail";
}) {
  if (items.length === 0) {
    return null;
  }

  const rail = density === "rail";
  const fillers = rail ? 0 : items.length % 2;

  return (
    <section className={cn("space-y-1.5", rail && "space-y-1")}>
      <HubSectionLabel
        title="Needs attention"
        meta={`${items.length} to review`}
        className="px-0.5"
      />
      <div
        className={cn(
          HUB_SURFACE,
          "grid gap-px",
          CELL_DIVIDE,
          rail ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
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
                "group flex items-center gap-2.5 bg-white transition-colors",
                "hover:bg-[color-mix(in_srgb,#141414_2.5%,white)]",
                "active:bg-[color-mix(in_srgb,#0f766e_6%,white)]",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f766e]/45",
                rail ? "min-h-11 gap-2 px-2.5 py-2" : "min-h-12 gap-3 px-3 py-2.5",
              )}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center border bg-white",
                  rail ? "size-7" : "size-8",
                  warning
                    ? "border-[#C47A5A]/35 text-[#C47A5A]"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[#0f766e]",
                )}
              >
                <Icon className={cn(rail ? "size-3.5" : "size-4")} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block font-semibold leading-snug tracking-[-0.015em] text-[#141414]",
                    rail
                      ? "line-clamp-2 text-[12px]"
                      : "truncate text-[13px]",
                  )}
                >
                  {item.label}
                </span>
                {item.detail ? (
                  <span
                    className={cn(
                      "mt-0.5 block leading-snug text-[#6F6F6F]",
                      rail
                        ? "line-clamp-2 text-[10px]"
                        : "truncate text-[11px]",
                    )}
                  >
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <ChevronRight
                className={cn(
                  "shrink-0 text-[#C8C2B6] transition-colors group-hover:text-[#0f766e]",
                  rail ? "size-3.5" : "size-4",
                )}
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
