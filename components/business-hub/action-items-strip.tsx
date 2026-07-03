"use client";

import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";

import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import { fmtCount } from "@/lib/business-hub/formatters";
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
    <section className="space-y-4">
      <h2 className={cn("text-sm font-medium", HUB_MUTED)}>Needs attention</h2>
      <div className={cn(HUB_SURFACE, "divide-y divide-[#EEEEEE]")}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#F9F6F0]/60"
          >
            <AlertTriangle
              className={cn(
                "size-4 shrink-0",
                item.tone === "warning"
                  ? "text-[#C47A5A]"
                  : "text-[#B08D48]",
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-black">{item.label}</p>
              {item.detail ? (
                <p className="text-xs text-[#888888]">{item.detail}</p>
              ) : null}
            </div>
            <ArrowRight
              className="size-4 shrink-0 text-[#CCCCCC]"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
