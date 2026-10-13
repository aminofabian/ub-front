"use client";

import Link from "next/link";

import type { JumpInLink } from "@/components/business-hub/jump-in-grid";
import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

const TILE_LINK =
  "rounded-none border border-[color-mix(in_srgb,#141414_7%,transparent)] bg-white text-[#141414] transition-colors hover:border-[#0f766e]/30 hover:bg-[#F1F9F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/45";

/** Shortcuts for the board. Phones use one scrolling row; the desk rail uses a grid. */
export function HubQuickActions({
  links,
  limit = 6,
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
                "inline-flex h-9 shrink-0 items-center gap-1.5 px-2.5",
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
    <section className={cn(HUB_SURFACE, "p-3 sm:p-3.5")}>
      <h3 className="text-[12px] font-semibold tracking-[-0.02em] text-[#141414]">
        {title}
      </h3>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {tiles.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href + link.label}
              href={link.href}
              title={link.hint}
              className={cn(
                TILE_LINK,
                "group flex min-h-12 flex-col items-center justify-center gap-1 bg-[#FBFCFB] px-1 py-1.5 text-center",
              )}
            >
              <Icon className="size-4 shrink-0 text-[#0f766e]" aria-hidden />
              <span className="w-full truncate text-[10px] font-medium leading-tight text-[#141414]">
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
