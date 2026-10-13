"use client";

import Link from "next/link";
import { ClipboardList, PackagePlus } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

export type ReceivePath = "against-order" | "walk-in";

/** Fork at Goods in: ordered receive vs direct walk-in supply. */
export function ReceivePathSwitcher({
  active,
  onWalkIn,
  className,
  compact = false,
}: {
  active: ReceivePath;
  /** Opens the walk-in / New supply flow. */
  onWalkIn: () => void;
  className?: string;
  /** Stock floor — segmented control, less copy. */
  compact?: boolean;
}) {
  const { me } = useDashboard();
  const isStockManager =
    compact || me?.role?.key?.trim().toLowerCase() === "stock_manager";

  if (isStockManager) {
    return (
      <div
        className={cn(
          "flex gap-0.5 rounded-full bg-[#eef1f0] p-0.5",
          className,
        )}
        role="group"
        aria-label="How goods arrived"
      >
        <Link
          href={APP_ROUTES.orderReceive}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-2 text-[13px] font-semibold transition-colors",
            active === "against-order"
              ? "bg-white text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.10)]"
              : "text-[#667085]",
          )}
        >
          <ClipboardList className="size-4 shrink-0" aria-hidden />
          Against order
        </Link>
        <button
          type="button"
          onClick={onWalkIn}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-2 text-[13px] font-semibold transition-colors",
            active === "walk-in"
              ? "bg-white text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.10)]"
              : "text-[#667085]",
          )}
        >
          <PackagePlus className="size-4 shrink-0" aria-hidden />
          Direct · no PO
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn("grid grid-cols-2 gap-2.5", className)}
      role="group"
      aria-label="How goods arrived"
    >
      <Link
        href={APP_ROUTES.orderReceive}
        className={cn(
          "flex items-start gap-2.5 rounded-2xl p-3 ring-1 transition-colors sm:gap-3",
          active === "against-order"
            ? "bg-[#f0f9f7] ring-2 ring-[#0f766e]"
            : "bg-white ring-black/[0.05] hover:ring-black/[0.1]",
        )}
      >
        <span
          className={cn(
            "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
            active === "against-order"
              ? "bg-[#0f766e] text-white"
              : "bg-[#f1f5f4] text-[#98a2b3]",
          )}
        >
          <ClipboardList className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold tracking-[-0.01em] text-[#101828]">
            Against an order
          </span>
          <span className="mt-0.5 hidden text-[12px] leading-snug text-[#667085] sm:block">
            China PO, marketplace, or any open order — mark arrived, then unpack
            into stock.
          </span>
        </span>
      </Link>

      <button
        type="button"
        onClick={onWalkIn}
        className={cn(
          "flex items-start gap-2.5 rounded-2xl p-3 text-left ring-1 transition-colors sm:gap-3",
          active === "walk-in"
            ? "bg-[#f0f9f7] ring-2 ring-[#0f766e]"
            : "bg-white ring-black/[0.05] hover:ring-black/[0.1]",
        )}
      >
        <span
          className={cn(
            "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
            active === "walk-in"
              ? "bg-[#0f766e] text-white"
              : "bg-[#f1f5f4] text-[#98a2b3]",
          )}
        >
          <PackagePlus className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold tracking-[-0.01em] text-[#101828]">
            Walk-in · no order
          </span>
          <span className="mt-0.5 hidden text-[12px] leading-snug text-[#667085] sm:block">
            Direct supply — supplier shows up, you count, stock rises when you
            post.
          </span>
        </span>
      </button>
    </div>
  );
}
