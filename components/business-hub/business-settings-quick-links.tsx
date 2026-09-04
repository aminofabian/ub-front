"use client";

import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

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
    <div
      className={cn(
        "grid gap-2 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {links.map(({ href, label, desc, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            HUB_SURFACE,
            "group flex items-start gap-3 p-3.5 transition-colors hover:border-[#B08D48]/40",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-none bg-[#F0EEE9] text-[#B08D48] transition-colors group-hover:bg-[#F7F2E8]">
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-[13px] font-medium tracking-[-0.01em] text-[#141414]">
              {label}
              <ArrowUpRight
                className="size-3 shrink-0 text-[#D4CBB8] transition-colors group-hover:text-[#B08D48]"
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
  );
}
