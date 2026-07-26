"use client";

import Link from "next/link";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
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
    <section className="space-y-2">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A8A8A]">
        Top sellers · 30d
      </h2>
      <div className={cn(HUB_SURFACE, "overflow-hidden")}>
        <div className="divide-y divide-[#EDE8DF]">
          {rows.map((sku, i) => {
            const revenue = toNum(sku.revenueLast30Days);
            return (
              <Link
                key={sku.itemId}
                href={`/products?search=${encodeURIComponent(sku.itemName)}`}
                className="group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-[#FCFAF6]"
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center font-mono text-[10px] font-semibold tabular-nums",
                    i === 0
                      ? "bg-[#141414] text-[#F5E6C8]"
                      : "border border-[#E6E1D8] bg-[#F7F5F1] text-[#666666]",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#141414] group-hover:text-[#8A6B2E]">
                  {sku.itemName}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[#141414]">
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
