import type { ReviewLine } from "@/lib/count-cycle/rank-review-lines";
import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";
import { ProductThumb } from "./product-thumb";

function varianceChip(variance: number | null): { text: string; tone: string } {
  if (variance == null) return { text: "No system figure", tone: COUNT_TONE.faint };
  if (variance === 0) return { text: "Matches", tone: COUNT_TONE.mute };
  const sign = variance > 0 ? "+" : "−";
  return {
    text: `${sign}${Math.abs(variance)}`,
    tone: variance > 0 ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700",
  };
}

/** A counted product next to what the system expected, gap called out on the right. */
export function ReviewLineRow({ line }: { line: ReviewLine }) {
  const chip = varianceChip(line.variance);
  const showsGap = line.variance != null && line.variance !== 0;
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <ProductThumb name={line.itemName} imageUrl={line.imageUrl} />
      <div className="min-w-0 flex-1">
        <p className={cn("line-clamp-2 text-[15px] font-medium leading-snug", COUNT_TONE.ink)}>{line.itemName}</p>
        <p className={cn("mt-0.5 text-[13px] tabular-nums", COUNT_TONE.mute)}>
          Counted {Number(line.countedQty)}
          {line.systemQty != null ? ` · System ${Number(line.systemQty)}` : ""}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          showsGap
            ? "rounded-[2px] px-2.5 py-1 text-[18px] font-semibold"
            : "text-[13px]",
          chip.tone,
        )}
      >
        {chip.text}
      </span>
    </div>
  );
}
