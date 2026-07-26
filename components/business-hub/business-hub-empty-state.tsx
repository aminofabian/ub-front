"use client";

import Link from "next/link";
import { Package, ShoppingCart, Store } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function BusinessHubEmptyState({
  period,
  showStorefrontLink = false,
}: {
  period: "today" | "week";
  showStorefrontLink?: boolean;
}) {
  const label = period === "today" ? "today" : "this week";

  return (
    <section
      className={cn(HUB_SURFACE, "px-4 py-5 sm:px-5")}
      aria-label="No sales yet"
    >
      <div className="mx-auto max-w-lg text-center">
        <p
          className="text-xl font-medium tracking-tight text-black"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          No sales {label} yet
        </p>
        <p className={cn("mt-1.5 text-sm leading-snug", HUB_MUTED)}>
          This board wakes up the moment money moves. Add products, open the
          till, and the pulse, runway, and movers will fill in.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            href={APP_ROUTES.salesQuick}
            className="inline-flex items-center gap-2 bg-[#B08D48] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <ShoppingCart className="size-3.5" aria-hidden />
            Record a sale
          </Link>
          <Link
            href={APP_ROUTES.products}
            className="inline-flex items-center gap-2 border border-[#EEEEEE] bg-white px-3 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            <Package className="size-3.5 text-[#888888]" aria-hidden />
            Add products
          </Link>
          {showStorefrontLink ? (
            <Link
              href={APP_ROUTES.businessSettings}
              className="inline-flex items-center gap-2 border border-[#EEEEEE] bg-white px-3 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              <Store className="size-3.5 text-[#888888]" aria-hidden />
              Storefront setup
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
