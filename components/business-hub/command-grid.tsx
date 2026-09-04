"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { HUB_SECTION } from "@/lib/business-hub/constants";
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
    <section className="space-y-2.5">
      <h2 className={HUB_SECTION}>Jump in</h2>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            title={link.hint}
            className={cn(
              "group inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2",
              "ring-1 ring-[color-mix(in_srgb,#141414_7%,transparent)]",
              "transition-colors hover:bg-[#FAF9F6] hover:ring-[#B08D48]/40",
            )}
          >
            <link.icon
              className="size-3.5 shrink-0 text-[#B08D48]"
              aria-hidden
            />
            <span className="text-[13px] font-medium text-[#141414]">
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
