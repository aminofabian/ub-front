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
    <section className="flex flex-col gap-3">
      <HubSectionLabel
        title="Needs attention"
        meta={`${items.length} to review`}
      />
      <div className="flex flex-wrap gap-3.5">
        {items.map((item) => {
          const tone = TONES[item.tone === "info" ? "info" : "warning"];
          const Icon = item.tone === "info" ? Info : AlertTriangle;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex min-h-[76px] flex-1 basis-[300px] items-center gap-3.5 rounded-[18px] border px-[18px] py-3.5 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent,#0F4A38)]/45",
                tone.card,
              )}
            >
              <span
                className={cn(
                  "flex size-[42px] shrink-0 items-center justify-center rounded-xl",
                  tone.icon,
                )}
              >
                <Icon className="size-5" strokeWidth={1.9} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold tracking-[-0.005em] text-[var(--hub-ink,#14211C)]">
                  {item.label}
                </span>
                {item.detail ? (
                  <span className="mt-0.5 block truncate text-[13px] text-[var(--hub-muted,#5E6B65)]">
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <ChevronRight
                className="size-[18px] shrink-0 text-[var(--hub-muted,#5E6B65)]"
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
