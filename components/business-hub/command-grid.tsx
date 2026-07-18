"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
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
    <section className="space-y-3">
      <div>
        <h2 className={cn("text-sm font-medium", HUB_MUTED)}>Jump in</h2>
        <p className="mt-1 text-sm text-[#666666]">
          The rooms you open most while running the shop.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            className={cn(
              HUB_SURFACE,
              "group flex items-start gap-3 px-4 py-4 transition-colors hover:border-[#E8DFD0] hover:bg-[#FCFBF8]",
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F9F6F0] text-[#B08D48]">
              <link.icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-black">
                {link.label}
                <ArrowUpRight
                  className="size-3.5 text-[#CCCCCC] transition-colors group-hover:text-[#B08D48]"
                  aria-hidden
                />
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-[#888888]">
                {link.hint}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
