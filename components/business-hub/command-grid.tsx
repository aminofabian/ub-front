"use client";

import Link from "next/link";

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
    <nav className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Shortcuts">
      {links.map((link) => (
        <Link
          key={link.href + link.label}
          href={link.href}
          title={link.hint}
          className="text-[12px] font-medium text-[#666666] transition-colors hover:text-[#8A6B2E]"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
