"use client";

import Link from "next/link";
import { ClipboardList, PackagePlus } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

export type ReceivePath = "against-order" | "walk-in";

/** Fork at Goods in: ordered receive vs direct walk-in supply. */
export function ReceivePathSwitcher({
  active,
  onWalkIn,
  className,
}: {
  active: ReceivePath;
  /** Opens the walk-in / New supply flow. */
  onWalkIn: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 sm:grid-cols-2",
        className,
      )}
      role="group"
      aria-label="How goods arrived"
    >
      <Link
        href={APP_ROUTES.orderReceive}
        className={cn(
          "flex items-start gap-3 border px-3 py-2.5 transition-colors",
          active === "against-order"
            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]"
            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_24%,transparent)]",
        )}
      >
        <span
          className={cn(
            "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center border",
            active === "against-order"
              ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
              : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]",
          )}
        >
          <ClipboardList className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
            Against an order
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
            China PO, marketplace, or any open order — mark arrived, then unpack
            into stock.
          </span>
        </span>
      </Link>

      <button
        type="button"
        onClick={onWalkIn}
        className={cn(
          "flex items-start gap-3 border px-3 py-2.5 text-left transition-colors",
          active === "walk-in"
            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]"
            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_24%,transparent)]",
        )}
      >
        <span
          className={cn(
            "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center border",
            active === "walk-in"
              ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
              : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]",
          )}
        >
          <PackagePlus className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
            Walk-in · no order
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
            Direct supply — supplier shows up, you count, stock rises when you
            post.
          </span>
        </span>
      </button>
    </div>
  );
}
