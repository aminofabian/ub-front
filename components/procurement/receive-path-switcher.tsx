"use client";

import Link from "next/link";
import { ClipboardList, PackagePlus } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

export type ReceivePath = "against-order" | "walk-in";

/**
 * Fork at Goods in: ordered receive vs direct walk-in supply.
 * Compact segmented control — meant to sit in the buying-journey hub row.
 */
export function ReceivePathSwitcher({
  active,
  onWalkIn,
  className,
}: {
  active: ReceivePath;
  /** Opens the walk-in / New supply flow. */
  onWalkIn: () => void;
  className?: string;
  /** @deprecated Always compact; kept for call-site compatibility. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-stretch gap-0.5 rounded-full bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)] p-0.5",
        className,
      )}
      role="group"
      aria-label="How goods arrived"
    >
      <Link
        href={APP_ROUTES.orderReceive}
        title="China PO, marketplace, or any open order — mark arrived, then unpack into stock."
        className={cn(
          "inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold tracking-[-0.01em] transition-colors sm:px-3",
          active === "against-order"
            ? "bg-white text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.10)]"
            : "text-[#667085] hover:text-[#344054]",
        )}
      >
        <ClipboardList className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">Against order</span>
      </Link>
      <button
        type="button"
        onClick={onWalkIn}
        title="Direct supply — supplier shows up, you count, stock rises when you post."
        className={cn(
          "inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold tracking-[-0.01em] transition-colors sm:px-3",
          active === "walk-in"
            ? "bg-white text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.10)]"
            : "text-[#667085] hover:text-[#344054]",
        )}
      >
        <PackagePlus className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">Walk-in</span>
      </button>
    </div>
  );
}
