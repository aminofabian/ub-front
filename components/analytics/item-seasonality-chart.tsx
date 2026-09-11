"use client";

import { useMemo } from "react";

import type { ItemSeasonalityResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

type View = "rolling12" | "thisYear" | "lastYear";

const VIEWS: { key: View; label: string }[] = [
  { key: "rolling12", label: "12 months" },
  { key: "thisYear", label: "This year" },
  { key: "lastYear", label: "Last year" },
];

export function ItemSeasonalityChart({
  data,
  view,
  onViewChange,
  compact,
}: {
  data: ItemSeasonalityResponse;
  view: View;
  onViewChange: (view: View) => void;
  compact?: boolean;
}) {
  const max = useMemo(() => {
    return Math.max(1, ...data.months.map((m) => toNum(m.qty)));
  }, [data.months]);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
          Units by month
        </p>
        <div className="flex gap-0.5" role="group" aria-label="Season window">
          {VIEWS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onViewChange(item.key)}
              className={cn(
                "h-5 rounded-none px-1.5 text-[9px] font-semibold",
                view === item.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className={cn(
          "flex items-end gap-0.5",
          compact ? "h-16" : "h-24",
        )}
        role="img"
        aria-label="Monthly units sold"
      >
        {data.months.map((bucket) => {
          const qty = toNum(bucket.qty);
          const h = Math.max(qty > 0 ? 8 : 3, (qty / max) * 100);
          return (
            <div
              key={`${bucket.year}-${bucket.month}`}
              className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"
              title={`${bucket.label} ${bucket.year}: ${qty}`}
            >
              <span
                className={cn(
                  "w-full max-w-[14px] rounded-none transition-colors",
                  qty > 0
                    ? bucket.peak
                      ? "bg-foreground/80 group-hover:bg-foreground"
                      : "bg-foreground/40 group-hover:bg-foreground/70"
                    : "bg-muted",
                )}
                style={{ height: `${h}%` }}
              />
              <span className="mt-1 text-[8px] text-muted-foreground">
                {bucket.label.split(" · ")[0]?.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
      {data.peakLabel ? (
        <p className="text-[11px] text-muted-foreground">
          Peak {data.peakLabel}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Not enough months yet to call a peak.
        </p>
      )}
      {data.companions.length > 0 ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Also in the basket:{" "}
          {data.companions
            .slice(0, 4)
            .map((c) => c.itemName)
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
