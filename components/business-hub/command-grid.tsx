"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { HUB_BTN, HUB_SECTION } from "@/lib/business-hub/constants";
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
      <h2 className={HUB_SECTION}>Jump in</h2>
      <div className="flex flex-wrap gap-1.5">
        {links.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            title={link.hint}
            className={cn(
              HUB_BTN,
              "group inline-flex items-center gap-2 bg-white px-3 py-1.5",
              "ring-1 ring-[color-mix(in_srgb,#141414_9%,transparent)]",
              "hover:bg-[#FAF8F3] hover:ring-[#B08D48]/45",
            )}
          >
            <link.icon
              className="size-3.5 shrink-0 text-[#B08D48]"
              aria-hidden
            />
            <span className="text-[12px] font-medium text-[#141414]">
              {link.label}
            </span>
            <ArrowUpRight
              className="size-3 shrink-0 text-[#C8C2B6] transition-colors group-hover:text-[#B08D48]"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
