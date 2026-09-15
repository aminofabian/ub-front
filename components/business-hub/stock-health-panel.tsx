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
  /** `alert` = needs a decision, `watch` = worth a look, `ok` = nothing to do. */
  tone?: "ok" | "watch" | "alert";
};

const CELL_DIVIDE = "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]";
const CELL_FILL = "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]";

/**
 * Store and stock checks as one even two-up (three-up on a tablet) board. The
 * old layout collapsed to a single column on a phone, which is what turned six
 * numbers into a scroll.
 */
export function StockHealthPanel({ items }: { items: StockHealthItem[] }) {
  if (items.length === 0) return null;

  const fill = (columns: number) => (columns - (items.length % columns)) % columns;

  return (
    <section aria-label="Store and stock" className={cn(HUB_SURFACE)}>
      <div
        className={cn(
          "grid grid-cols-2 gap-px sm:grid-cols-3",
          CELL_DIVIDE,
        )}
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            title={`${item.label}: ${item.value} — ${item.detail}`}
            className={cn(
              "group flex min-h-12 min-w-0 items-center gap-2.5 bg-white px-3 py-2.5 transition-colors",
              "hover:bg-[color-mix(in_srgb,#0f766e_3%,white)]",
              "active:bg-[color-mix(in_srgb,#0f766e_6%,white)]",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f766e]/45",
            )}
          >
            <span
              className={cn(
                "size-1.5 shrink-0",
                item.tone === "alert" && "bg-[#C47A5A]",
                item.tone === "watch" && "bg-[#0f766e]",
                (!item.tone || item.tone === "ok") && "bg-emerald-600",
              )}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-[10px] font-medium leading-tight",
                  HUB_MUTED,
                )}
              >
                {item.label}
              </span>
              <span
                className="mt-1 block truncate text-[14px] font-semibold leading-none tracking-[-0.02em] text-[#141414] tabular-nums sm:text-[13px]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {item.value}
              </span>
              <span className="mt-1 hidden truncate text-[10px] text-[#6F6F6F] sm:block">
                {item.detail}
              </span>
            </span>
          </Link>
        ))}

        {Array.from({ length: fill(2) }).map((_, index) => (
          <span
            key={`phone-fill-${index}`}
            aria-hidden
            className={cn("min-h-12 sm:hidden", CELL_FILL)}
          />
        ))}
        {Array.from({ length: fill(3) }).map((_, index) => (
          <span
            key={`sm-fill-${index}`}
            aria-hidden
            className={cn("hidden min-h-12 sm:block", CELL_FILL)}
          />
        ))}
      </div>
    </section>
  );
}
