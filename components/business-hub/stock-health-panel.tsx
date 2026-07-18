"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export type StockHealthItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  href: string;
  tone?: "ok" | "watch" | "alert";
};

export function StockHealthPanel({ items }: { items: StockHealthItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className={cn("text-sm font-medium", HUB_MUTED)}>
            Store & stock health
          </h2>
          <p className="mt-1 text-sm text-[#666666]">
            What your shelves and books look like right now.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              HUB_SURFACE,
              "group relative overflow-hidden px-5 py-4 transition-colors hover:border-[#E8DFD0]",
            )}
          >
            <div
              className={cn(
                "absolute inset-y-0 left-0 w-1",
                item.tone === "alert" && "bg-[#C47A5A]",
                item.tone === "watch" && "bg-[#B08D48]",
                (!item.tone || item.tone === "ok") && "bg-emerald-500/70",
              )}
              aria-hidden
            />
            <div className="flex items-start justify-between gap-3 pl-2">
              <div className="min-w-0">
                <p className={cn("text-xs font-medium", HUB_MUTED)}>
                  {item.label}
                </p>
                <p className="mt-1.5 text-2xl font-semibold tracking-tight text-black tabular-nums">
                  {item.value}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#888888]">
                  {item.detail}
                </p>
              </div>
              <ArrowRight
                className="mt-1 size-4 shrink-0 text-[#DDDDDD] transition-colors group-hover:text-[#B08D48]"
                aria-hidden
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
