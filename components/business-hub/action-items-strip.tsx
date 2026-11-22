"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, Info } from "lucide-react";

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
    card: "border-[#F0DDB8] bg-[#FFF8EC] hover:border-[#E3C98A]",
    icon: "bg-[#FBEBD2] text-[#8A4B00]",
  },
  info: {
    card: "border-[var(--hub-rule,#E7E3D8)] bg-[var(--hub-paper,#FFFFFF)] hover:border-[var(--hub-accent,#0F4A38)]/40",
    icon: "bg-[#E3EEE8] text-[var(--hub-accent,#0F4A38)]",
  },
} as const;

/** The queue: what the shop needs a human to look at, one card per job. */
export function ActionItemsStrip({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-1.5">
      <HubSectionLabel
        title="Needs attention"
        meta={`${items.length} to review`}
      />
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const tone = TONES[item.tone === "info" ? "info" : "warning"];
          const Icon = item.tone === "info" ? Info : AlertTriangle;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex min-h-11 flex-1 basis-[260px] items-center gap-2.5 rounded-[2px] border px-3 py-2 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent,#0F4A38)]/45",
                tone.card,
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-[2px]",
                  tone.icon,
                )}
              >
                <Icon className="size-4" strokeWidth={1.9} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold tracking-[-0.005em] text-[var(--hub-ink,#14211C)]">
                  {item.label}
                </span>
                {item.detail ? (
                  <span className="block truncate text-[11px] text-[var(--hub-muted,#5E6B65)]">
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-[var(--hub-muted,#5E6B65)]"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
