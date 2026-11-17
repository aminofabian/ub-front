"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

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
    <section className="flex flex-col gap-3">
      <h3 className="text-[17px] font-semibold text-[var(--hub-ink)]">Work</h3>
      <div className="flex flex-wrap gap-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.id}
              href={card.href}
              className={cn(
                "flex min-h-[76px] flex-1 basis-[230px] items-center gap-3.5 rounded-[18px] border border-[var(--hub-rule,#E7E3D8)] bg-[var(--hub-paper,#FFFFFF)] px-[18px] py-3.5 transition-colors hover:border-[var(--hub-accent,#0F4A38)]/40",
              )}
            >
              <span className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-[#E3EEE8] text-[var(--hub-accent,#0F4A38)]">
                <Icon className="size-5" strokeWidth={1.9} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-[var(--hub-muted,#5E6B65)]">
                  {card.label}
                </span>
                <span className="mt-0.5 block truncate text-[17px] font-semibold tabular-nums tracking-[-0.01em] text-[var(--hub-ink,#14211C)]">
                  {card.meta}
                </span>
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
