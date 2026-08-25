"use client";

import Link from "next/link";

import { toNum } from "@/lib/business-hub/formatters";
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
      <h2 className="mb-1 text-[12px] font-medium text-[#888888]">
        Best sellers · 30 days
      </h2>
      <div className="space-y-0.5">
        {rows.map((sku, i) => {
          const revenue = toNum(sku.revenueLast30Days);
          return (
            <Link
              key={sku.itemId}
              href={`/products?search=${encodeURIComponent(sku.itemName)}`}
              className="group flex items-center gap-2 py-0.5 transition-colors hover:text-[#8A6B2E]"
            >
              <span className="w-3 shrink-0 font-mono text-[10px] tabular-nums text-[#B0A898]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#141414]">
                {sku.itemName}
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-[#141414]">
                {formatMoneyCompact(revenue)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
