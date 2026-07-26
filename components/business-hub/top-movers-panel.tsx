"use client";

import Link from "next/link";

import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import { HUB_ACCENT, HUB_SURFACE } from "@/lib/business-hub/constants";
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

  const rows = movers.slice(0, 5);
  const max = Math.max(...rows.map((m) => toNum(m.revenueLast30Days)), 1);

  return (
    <section className="hub-rise hub-rise-delay-3 space-y-2">
      <HubSectionLabel index="05" title="What's selling" meta="Last 30 days" />
      <div className={cn(HUB_SURFACE, "overflow-hidden")}>
        <div className="divide-y divide-[#EDE8DF]">
          {rows.map((sku, i) => {
            const revenue = toNum(sku.revenueLast30Days);
            const share = Math.max(4, Math.round((revenue / max) * 100));
            return (
              <Link
                key={sku.itemId}
                href={`/products?search=${encodeURIComponent(sku.itemName)}`}
                className="group block px-3 py-2.5 transition-colors hover:bg-[#FCFAF6]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
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
                    <span className="truncate text-sm font-medium text-[#141414] transition-colors group-hover:text-[#8A6B2E]">
                      {sku.itemName}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-[#141414]">
                    {formatMoneyCompact(revenue)}
                  </span>
                </div>
                <div className="mt-2 h-0.5 overflow-hidden bg-[#F0EBE3]">
                  <div
                    className="h-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${share}%`,
                      backgroundColor: i === 0 ? HUB_ACCENT : "#D9C7A0",
                      transitionDelay: `${i * 60}ms`,
                    }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
