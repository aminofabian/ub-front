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
    <section className="space-y-2">
      <h2 className={cn("text-sm font-medium", HUB_MUTED)}>
        Store & stock health
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              HUB_SURFACE,
              "group relative overflow-hidden px-3.5 py-3 transition-colors hover:border-[#E8DFD0]",
            )}
          >
            <div
              className={cn(
                "absolute inset-y-0 left-0 w-0.5",
                item.tone === "alert" && "bg-[#C47A5A]",
                item.tone === "watch" && "bg-[#B08D48]",
                (!item.tone || item.tone === "ok") && "bg-emerald-500/70",
              )}
              aria-hidden
            />
            <div className="flex items-start justify-between gap-2 pl-2">
              <div className="min-w-0">
                <p className={cn("text-[11px] font-medium", HUB_MUTED)}>
                  {item.label}
                </p>
                <p className="mt-0.5 text-xl font-semibold tracking-tight text-black tabular-nums">
                  {item.value}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#888888]">
                  {item.detail}
                </p>
              </div>
              <ArrowRight
                className="mt-0.5 size-3.5 shrink-0 text-[#DDDDDD] transition-colors group-hover:text-[#B08D48]"
                aria-hidden
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
