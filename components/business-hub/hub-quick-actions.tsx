"use client";

import Link from "next/link";

import type { JumpInLink } from "@/components/business-hub/jump-in-grid";
import { cn } from "@/lib/utils";

const TILE_LINK =
  "flex min-h-[3.1rem] min-w-0 items-center gap-3 rounded-[2px] border-b border-[var(--hub-rule)] bg-transparent px-1 py-3 text-left transition-colors hover:text-[var(--hub-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent)]/35";

/**
 * Shortcuts the bottom tabs don't already cover — Add expense, Count stock,
 * and so on. A two-up board of cards with an icon chip and a label.
 */
export function HubQuickActions({
  links,
  limit = 4,
  title = "Quick actions",
  presentation = "grid",
}: {
  links: JumpInLink[];
  limit?: number;
  title?: string;
  presentation?: "grid" | "strip";
}) {
  const tiles = links.slice(0, limit);
  if (tiles.length === 0) return null;

  if (presentation === "strip") {
    return (
      <nav
        aria-label={title}
        className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tiles.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href + link.label}
              href={link.href}
              title={link.hint}
              className={cn(
                TILE_LINK,
                "inline-flex h-9 min-h-0 shrink-0 px-2.5",
              )}
            >
              <Icon className="size-3.5 shrink-0 text-[#0f766e]" aria-hidden />
              <span className="text-[12px] font-medium leading-none">
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="px-0.5 text-[13px] font-semibold tracking-[0.005em] text-[var(--hub-ink)]">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0">
        {tiles.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href + link.label}
              href={link.href}
              title={link.hint}
              className={TILE_LINK}
            >
              <Icon
                className="size-4 shrink-0 text-[var(--hub-accent)]"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="min-w-0 text-[13px] font-medium leading-tight text-[var(--hub-ink)]">
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
