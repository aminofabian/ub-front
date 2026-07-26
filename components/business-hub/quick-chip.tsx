"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function QuickChip({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 border border-[#EEEEEE] bg-white px-3 py-2 text-sm font-medium text-black",
        "transition-opacity hover:opacity-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/30",
      )}
    >
      <Icon className="size-3.5 text-[#888888]" aria-hidden />
      {label}
      <ArrowRight className="size-3 text-[#888888]" aria-hidden />
    </Link>
  );
}
