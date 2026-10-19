import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import type { FullCountProgress } from "@/lib/count-cycle/to-full-count-progress";
import { cn } from "@/lib/utils";

const INK = "text-[var(--order-ink,#15231f)]";
const MUTE = "text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]";

/** Nudge above the stock list while a batch-by-batch full count is still running. */
export function FullCountBanner({ progress }: { progress: FullCountProgress }) {
  const pct = progress.total > 0 ? Math.min(100, Math.round((progress.counted / progress.total) * 100)) : 0;
  return (
    <Link
      href={APP_ROUTES.inventoryStockTakeBatches}
      className={cn(
        "flex shrink-0 items-center gap-3 border-b border-[var(--op-rule)] px-3 py-2.5 transition-colors md:gap-2 md:px-2.5 md:py-1.5",
        "bg-[color-mix(in_srgb,var(--op-accent,#1d4b3b)_4%,var(--op-surface))] hover:bg-[color-mix(in_srgb,var(--op-accent,#1d4b3b)_7%,var(--op-surface))]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
      )}
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] text-[var(--op-accent)] md:size-6">
        <ClipboardList className="size-4 md:size-3.5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[14px] font-semibold tabular-nums md:text-[11px]", INK)}>
          Full count · {progress.counted.toLocaleString("en-KE")} of {progress.total.toLocaleString("en-KE")}
        </span>
        <span className={cn("block truncate text-[12.5px] md:text-[10.5px]", MUTE)}>{progress.detail}</span>
        <span
          className="mt-1.5 block h-1 overflow-hidden rounded-[1px] bg-[color-mix(in_srgb,var(--op-ink)_8%,var(--op-surface))] md:mt-1 md:h-0.5"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Full count progress"
        >
          <span className="block h-full rounded-[1px] bg-[var(--op-accent)]" style={{ width: `${pct}%` }} />
        </span>
      </span>
      <span className="inline-flex h-9 shrink-0 items-center rounded-[2px] bg-[var(--op-accent)] px-3.5 text-[13px] font-semibold text-[var(--op-surface)] md:h-6 md:px-2.5 md:text-[10px]">
        Count
      </span>
    </Link>
  );
}
