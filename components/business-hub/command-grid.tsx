"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";

import { HUB_BTN, HUB_SURFACE } from "@/lib/business-hub/constants";
import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import { cn } from "@/lib/utils";

export type CommandLink = {
  href: string;
  label: string;
  hint: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
};

export function CommandGrid({ links }: { links: CommandLink[] }) {
  if (links.length === 0) return null;

  return (
    <section className="space-y-1.5 border-t border-[color-mix(in_srgb,#141414_7%,transparent)] pt-2.5">
      <HubSectionLabel title="Jump in" className="px-0.5" />

      {/* Phone: settings-style list. Desktop: compact chip row. */}
      <div
        className={cn(
          HUB_SURFACE,
          "divide-y divide-[color-mix(in_srgb,#141414_8%,transparent)] sm:hidden",
        )}
      >
        {links.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            title={link.hint}
            className="flex min-h-12 items-center gap-3 px-3 py-2.5 active:bg-white"
          >
            <span className="flex size-8 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[#0f766e]">
              <link.icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-[#141414]">
                {link.label}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-[#7A7A7A]">
                {link.hint}
              </span>
            </span>
            <ChevronRight
              className="size-4 shrink-0 text-[#C8C2B6]"
              aria-hidden
            />
          </Link>
        ))}
      </div>

      <div className="hidden flex-wrap gap-1 sm:flex">
        {links.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            title={link.hint}
            className={cn(
              HUB_BTN,
              "group inline-flex items-center gap-1.5 bg-white px-2.5 py-1.5",
              "ring-1 ring-[color-mix(in_srgb,#141414_8%,transparent)]",
              "hover:bg-white hover:ring-[#0f766e]/45",
            )}
          >
            <link.icon
              className="size-3.5 shrink-0 text-[#0f766e]"
              aria-hidden
            />
            <span className="text-[12px] font-medium text-[#141414]">
              {link.label}
            </span>
            <ArrowUpRight
              className="size-3 shrink-0 text-[#C8C2B6] transition-colors group-hover:text-[#0f766e]"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
