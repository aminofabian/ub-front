"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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
    <section className="space-y-2">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A8A8A]">
        Jump in
      </h2>
      <div className="flex flex-wrap gap-px border border-[#E6E1D8] bg-[#E6E1D8]">
        {links.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            title={link.hint}
            className={cn(
              HUB_SURFACE,
              "group inline-flex items-center gap-2 border-0 px-3 py-2 transition-colors hover:bg-[#141414]",
            )}
          >
            <link.icon
              className="size-3.5 shrink-0 text-[#B08D48] transition-colors group-hover:text-[#F5E6C8]"
              aria-hidden
            />
            <span className="text-xs font-semibold text-[#141414] transition-colors group-hover:text-white">
              {link.label}
            </span>
            <ArrowUpRight
              className="size-3 shrink-0 text-[#DDDDDD] transition-colors group-hover:text-[#B08D48]"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
