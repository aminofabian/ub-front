"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import { HUB_SURFACE } from "@/lib/business-hub/constants";
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
    <section className="hub-rise hub-rise-delay-4 space-y-2">
      <HubSectionLabel index="06" title="Jump in" meta={`${links.length} doors`} />
      <div className="grid gap-px border border-[#E6E1D8] bg-[#E6E1D8] sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link, i) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            className={cn(
              HUB_SURFACE,
              "group relative flex items-center gap-2.5 overflow-hidden border-0 px-3 py-2.5 transition-colors hover:bg-[#141414]",
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center bg-[#F9F6F0] text-[#B08D48] transition-colors group-hover:bg-[#B08D48] group-hover:text-white">
              <link.icon className="size-3.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-[#141414] transition-colors group-hover:text-white">
                <span className="truncate">{link.label}</span>
                <ArrowUpRight
                  className="size-3 shrink-0 text-[#CCCCCC] transition-colors group-hover:text-[#B08D48]"
                  aria-hidden
                />
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-[#888888] transition-colors group-hover:text-[#A3A3A3]">
                {link.hint}
              </span>
            </span>
            <span
              className="pointer-events-none absolute right-2 top-1.5 font-mono text-[9px] tabular-nums text-[#E0D8C8] transition-colors group-hover:text-[#5A5A5A]"
              aria-hidden
            >
              {String(i + 1).padStart(2, "0")}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
