"use client";

import Link from "next/link";

import type { JumpInLink } from "@/components/business-hub/jump-in-grid";
import { cn } from "@/lib/utils";

const TILE_LINK =
  "flex min-h-[3.75rem] min-w-0 items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-black/[0.05] transition-colors hover:bg-[#fafcfb] active:bg-[#f2f7f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/50";

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
      <h3 className="px-0.5 text-[14px] font-semibold tracking-[-0.01em] text-[#101828]">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href + link.label}
              href={link.href}
              title={link.hint}
              className={TILE_LINK}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e6f4f0] text-[#0f766e]">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 text-[13px] font-medium leading-tight text-[#101828]">
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
