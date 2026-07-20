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
    <section className="space-y-2">
      <h2 className={cn("text-sm font-medium", HUB_MUTED)}>Jump in</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            className={cn(
              HUB_SURFACE,
              "group flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:border-[#E8DFD0] hover:bg-[#FCFBF8]",
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#F9F6F0] text-[#B08D48]">
              <link.icon className="size-3.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-black">
                <span className="truncate">{link.label}</span>
                <ArrowUpRight
                  className="size-3 shrink-0 text-[#CCCCCC] transition-colors group-hover:text-[#B08D48]"
                  aria-hidden
                />
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-[#888888]">
                {link.hint}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
