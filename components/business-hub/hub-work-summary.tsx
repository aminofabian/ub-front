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
    <section className="space-y-2.5">
      <h3 className="px-0.5 text-[13px] font-semibold tracking-[0.005em] text-[var(--hub-ink)]">
        Work
      </h3>
      <div
        className={cn(
          "grid gap-0",
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
                "flex items-center gap-3 border-t border-[var(--hub-rule)] bg-transparent px-1 py-4 transition-colors hover:text-[var(--hub-accent)]",
              )}
            >
              <Icon
                className="size-4 shrink-0 text-[var(--hub-accent)]"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] text-[var(--hub-muted)]">
                  {card.label}
                </span>
                <span className="mt-0.5 block truncate text-[14px] font-semibold tracking-[-0.01em] text-[var(--hub-ink)]">
                  {card.meta}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-[var(--hub-faint)]" aria-hidden />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
