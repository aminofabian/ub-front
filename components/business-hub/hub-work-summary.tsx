"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export type HubWorkCard = {
  id: string;
  label: string;
  meta: string;
  href: string;
  icon: LucideIcon;
};

export function HubWorkSummary({ cards }: { cards: HubWorkCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="px-0.5 text-[12px] font-semibold tracking-[-0.02em] text-[#141414]">
        Work
      </h3>
      <div
        className={cn(
          "grid gap-2.5",
          cards.length === 1
            ? "grid-cols-1"
            : cards.length === 2
              ? "sm:grid-cols-2"
              : "sm:grid-cols-3",
        )}
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.id}
              href={card.href}
              className={cn(
                HUB_SURFACE,
                "flex items-center gap-3 p-3.5 transition-colors hover:border-[#0f766e]/30",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#E6F2F0] text-[#0f766e]">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] text-[#6F6F6F]">
                  {card.label}
                </span>
                <span className="mt-0.5 block truncate text-[14px] font-semibold tracking-[-0.02em] text-[#141414]">
                  {card.meta}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-[#C8C2B6]" aria-hidden />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
