"use client";

import Link from "next/link";

import type { JumpInLink } from "@/components/business-hub/jump-in-grid";
import { HUB_SECTION } from "@/lib/business-hub/constants";
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
    <section className="flex flex-col gap-1.5">
      <h3 className={HUB_SECTION}>{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {tiles.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href + link.label}
              href={link.href}
              title={link.hint}
              className="flex min-h-11 flex-1 basis-[132px] items-center gap-2 rounded-[2px] border border-[var(--hub-rule,#E7E3D8)] bg-[var(--hub-paper,#FFFFFF)] px-3 text-[13px] font-medium text-[var(--hub-ink,#14211C)] transition-colors hover:border-[var(--hub-accent,#0F4A38)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hub-accent,#0F4A38)]/35"
            >
              <Icon
                className="size-4 shrink-0 text-[var(--hub-accent,#0F4A38)]"
                strokeWidth={1.9}
                aria-hidden
              />
              <span className="min-w-0 truncate">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
