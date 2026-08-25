"use client";

import Link from "next/link";

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
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A8A8A]">
        Store & stock
      </h2>
      <div className="grid grid-cols-2 gap-px border border-[#E6E1D8] bg-[#E6E1D8] sm:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              HUB_SURFACE,
              "group relative overflow-hidden border-0 px-3 py-2.5 transition-colors hover:bg-[#FCFAF6]",
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
            <div className="pl-1.5">
              <p
                className={cn(
                  "text-[10px] font-medium uppercase tracking-[0.08em]",
                  HUB_MUTED,
                )}
              >
                {item.label}
              </p>
              <p className="mt-1 truncate text-[15px] font-semibold tracking-tight text-[#141414] tabular-nums">
                {item.value}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-[#888888]">
                {item.detail}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
