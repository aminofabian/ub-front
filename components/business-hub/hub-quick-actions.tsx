"use client";

import Link from "next/link";

import type { JumpInLink } from "@/components/business-hub/jump-in-grid";
import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

/** Shortcuts for the board — two across on phones, three on wider screens. */
export function HubQuickActions({
  links,
  limit = 6,
  title = "Quick actions",
}: {
  links: JumpInLink[];
  limit?: number;
  title?: string;
}) {
  const tiles = links.slice(0, limit);
  if (tiles.length === 0) return null;

  return (
    <section className={cn(HUB_SURFACE, "p-3 sm:p-3.5")}>
      <h3 className="text-[12px] font-semibold tracking-[-0.02em] text-[#141414]">
        {title}
      </h3>
      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href + link.label}
              href={link.href}
              title={link.hint}
              className={cn(
                "group flex min-h-[3.75rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,#141414_7%,transparent)] bg-[#FBFCFB] px-1.5 py-2 text-center transition-colors sm:min-h-[4.25rem]",
                "hover:border-[#0f766e]/30 hover:bg-[#F1F9F8]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/45",
              )}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#E6F2F0] text-[#0f766e]">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="w-full truncate text-[11px] font-medium leading-tight text-[#141414]">
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
