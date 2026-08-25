"use client";

import Link from "next/link";

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
    <section>
      <h2 className="mb-1 text-[12px] font-medium text-[#888888]">Stock</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="min-w-0 py-1 transition-colors hover:text-[#8A6B2E]"
          >
            <p className="text-[11px] text-[#888888]">{item.label}</p>
            <p
              className={cn(
                "truncate text-[14px] font-semibold tabular-nums tracking-tight",
                item.tone === "alert" && "text-[#C47A5A]",
                item.tone === "watch" && "text-[#8A6B2E]",
                (!item.tone || item.tone === "ok") && "text-[#141414]",
              )}
            >
              {item.value}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
