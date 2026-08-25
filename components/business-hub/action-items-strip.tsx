"use client";

import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

export type ActionItem = {
  id: string;
  label: string;
  detail?: string;
  href: string;
  tone?: "warning" | "info";
};

export function ActionItemsStrip({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 className="text-[12px] font-medium text-[#888888]">Needs a look</h2>
      {items.map((item) => {
        const Icon = item.tone === "info" ? Info : AlertTriangle;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1 text-[12px] font-medium transition-colors hover:underline",
              item.tone === "warning" ? "text-[#C47A5A]" : "text-[#8A6B2E]",
            )}
          >
            <Icon className="size-3" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </section>
  );
}
