"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronRight, type LucideIcon } from "lucide-react";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export type BusinessSettingsQuickLink = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
};

export function BusinessSettingsQuickLinks({
  links,
  className,
}: {
  links: BusinessSettingsQuickLink[];
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <>
      {/* Phone: iOS-style grouped list */}
      <div
        className={cn(
          HUB_SURFACE,
          "divide-y divide-[color-mix(in_srgb,#141414_8%,transparent)] sm:hidden",
          className,
        )}
      >
        {links.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-12 items-center gap-3 px-3 py-2.5 active:bg-white"
          >
            <span className="flex size-8 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[#0f766e]">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-[#141414]">
                {label}
              </span>
              <span className="mt-0.5 block truncate text-[11px] leading-snug text-[#7A7A7A]">
                {desc}
              </span>
            </span>
            <ChevronRight
              className="size-4 shrink-0 text-[#C8C2B6]"
              aria-hidden
            />
          </Link>
        ))}
      </div>

      {/* Tablet+ cards */}
      <div
        className={cn(
          "hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-4",
          className,
        )}
      >
        {links.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              HUB_SURFACE,
              "group flex items-start gap-3 p-3.5 transition-colors hover:border-[#0f766e]/40",
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[#0f766e] transition-colors group-hover:border-[#0f766e]">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[13px] font-medium tracking-[-0.01em] text-[#141414]">
                {label}
                <ArrowUpRight
                  className="size-3 shrink-0 text-[#8A8A8A] transition-colors group-hover:text-[#0f766e]"
                  aria-hidden
                />
              </span>
              <span className="mt-0.5 block text-[12px] leading-snug text-[#7A7A7A]">
                {desc}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
