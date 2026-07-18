"use client";

import Link from "next/link";

import { HUB_ACCENT, HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import { fmtKes, toNum } from "@/lib/business-hub/formatters";
import { cn } from "@/lib/utils";

export type TopMover = {
  itemId: string;
  itemName: string;
  revenueLast30Days: number | string;
};

export function TopMoversPanel({ movers }: { movers: TopMover[] }) {
  if (movers.length === 0) return null;

  const rows = movers.slice(0, 6);
  const max = Math.max(...rows.map((m) => toNum(m.revenueLast30Days)), 1);

  return (
    <section className="space-y-3">
      <div>
        <h2 className={cn("text-sm font-medium", HUB_MUTED)}>
          What&apos;s selling
        </h2>
        <p className="mt-1 text-sm text-[#666666]">
          Top products by revenue over the last 30 days.
        </p>
      </div>
      <div className={cn(HUB_SURFACE, "overflow-hidden")}>
        <div className="divide-y divide-[#F0EBE3]">
          {rows.map((sku, i) => {
            const revenue = toNum(sku.revenueLast30Days);
            const share = Math.max(4, Math.round((revenue / max) * 100));
            return (
              <Link
                key={sku.itemId}
                href={`/products?search=${encodeURIComponent(sku.itemName)}`}
                className="block px-5 py-3.5 transition-colors hover:bg-[#FCFBF8]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums"
                      style={{
                        backgroundColor: i === 0 ? "#F9F6F0" : "#F7F7F7",
                        color: i === 0 ? HUB_ACCENT : "#666666",
                        border: "1px solid #EEEEEE",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-black">
                      {sku.itemName}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-black">
                    {fmtKes(revenue)}
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#F3F0EA]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${share}%`,
                      backgroundColor: i === 0 ? HUB_ACCENT : "#D9C7A0",
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
