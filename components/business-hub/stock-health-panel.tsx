"use client";

import Link from "next/link";

import { HUB_MUTED, HUB_SECTION, HUB_SURFACE } from "@/lib/business-hub/constants";
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
      <h2 className={HUB_SECTION}>Store & stock</h2>
      <div
        className={cn(
          HUB_SURFACE,
          "grid grid-cols-2 divide-x divide-y divide-[color-mix(in_srgb,#141414_8%,transparent)] sm:grid-cols-4 sm:divide-y-0",
        )}
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative px-3.5 py-3 transition-colors hover:bg-[#FAF8F3]"
          >
            <span
              className={cn(
                "mb-2 block size-1.5",
                item.tone === "alert" && "bg-[#C47A5A]",
                item.tone === "watch" && "bg-[#B08D48]",
                (!item.tone || item.tone === "ok") && "bg-emerald-600",
              )}
              aria-hidden
            />
            <p className={cn("text-[11px] font-medium", HUB_MUTED)}>
              {item.label}
            </p>
            <p
              className="mt-1 truncate text-[15px] font-semibold tracking-[-0.02em] text-[#141414] tabular-nums"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              {item.value}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[#7A7A7A]">
              {item.detail}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
