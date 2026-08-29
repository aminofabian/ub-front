"use client";

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  fixedCostMonthLabel,
  shiftFixedCostMonth,
} from "@/lib/fixed-costs-utils";

type Props = {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  onRefresh?: () => void;
};

export function FixedCostsMonthNav({ year, month, onChange, onRefresh }: Props) {
  const shift = (delta: number) => {
    const next = shiftFixedCostMonth(year, month, delta);
    onChange(next.year, next.month);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => shift(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="min-w-[10rem] text-center text-sm font-semibold">
          {fixedCostMonthLabel(year, month)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => shift(1)}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      {onRefresh ? (
        <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
          Refresh
        </Button>
      ) : null}
    </div>
  );
}
