"use client";

import Link from "next/link";

import { HUB_SECTION, HUB_SURFACE } from "@/lib/business-hub/constants";
import { toNum } from "@/lib/business-hub/formatters";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

export type TopMover = {
  itemId: string;
  itemName: string;
  revenueLast30Days: number | string;
};

export function TopMoversPanel({ movers }: { movers: TopMover[] }) {
  const { formatMoneyCompact } = useFormatMoney();
  if (movers.length === 0) return null;

  const rows = movers.slice(0, 3);

  return (
    <section className="space-y-1">
      <h2 className={cn(HUB_SECTION, "px-0.5")}>Top sellers · 30d</h2>
      <div className={cn(HUB_SURFACE, "overflow-hidden")}>
        <div className="divide-y divide-[color-mix(in_srgb,#141414_8%,transparent)]">
          {rows.map((sku, i) => {
            const revenue = toNum(sku.revenueLast30Days);
            return (
              <Link
                key={sku.itemId}
                href={`/products?search=${encodeURIComponent(sku.itemName)}`}
                className="group flex items-center gap-2 px-2.5 py-1.5 transition-colors hover:bg-[#FAF8F3] sm:px-3"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center font-mono text-[9px] font-medium tabular-nums",
                    i === 0
                      ? "bg-[#F7F2E8] text-[#8A6B2E]"
                      : "bg-[#F0EEE9] text-[#666666]",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#141414] group-hover:text-[#8A6B2E]">
                  {sku.itemName}
                </span>
                <span
                  className="shrink-0 text-[12px] font-semibold tabular-nums text-[#141414]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {formatMoneyCompact(revenue)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
