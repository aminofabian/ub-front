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
    <section aria-label="Store and stock" className={cn(HUB_SURFACE)}>
      <div
        className={cn(
          "grid divide-x divide-y divide-[color-mix(in_srgb,#141414_8%,transparent)]",
          items.length === 1 && "grid-cols-1",
          items.length === 2 && "grid-cols-2 divide-y-0",
          items.length === 3 && "grid-cols-3 divide-y-0 max-sm:grid-cols-1 max-sm:divide-x-0 max-sm:divide-y",
          items.length === 4 && "grid-cols-2 sm:grid-cols-4 sm:divide-y-0",
          items.length >= 5 &&
            "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 xl:divide-y-0",
        )}
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            title={`${item.label}: ${item.value} — ${item.detail}`}
            className="group flex min-h-[3.75rem] min-w-0 items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-[#FAF8F3] sm:min-h-[3.25rem] sm:px-3 sm:py-2"
          >
            <span
              className={cn(
                "size-1.5 shrink-0",
                item.tone === "alert" && "bg-[#C47A5A]",
                item.tone === "watch" && "bg-[#B08D48]",
                (!item.tone || item.tone === "ok") && "bg-emerald-600",
              )}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span
                className={cn("block truncate text-[10px] font-medium", HUB_MUTED)}
              >
                {item.label}
              </span>
              <span
                className="mt-0.5 block truncate text-[14px] font-semibold leading-none tracking-[-0.02em] text-[#141414] tabular-nums sm:text-[13px]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {item.value}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-[#8A8A8A] max-sm:hidden">
                {item.detail}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
