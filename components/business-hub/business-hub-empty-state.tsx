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
      className={cn(HUB_SURFACE, "px-5 py-8 sm:px-8")}
      aria-label="No sales yet"
    >
      <div className="mx-auto max-w-lg text-center">
        <p className="text-base font-semibold text-black">No sales {label} yet</p>
        <p className={cn("mt-2 text-sm leading-relaxed", HUB_MUTED)}>
          Once you start selling, revenue, orders, and trends will show up here.
          Add products to your catalogue, then record your first sale.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={APP_ROUTES.salesQuick}
            className="inline-flex items-center gap-2 rounded-lg bg-[#B08D48] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <ShoppingCart className="size-4" aria-hidden />
            Record a sale
          </Link>
          <Link
            href={APP_ROUTES.products}
            className="inline-flex items-center gap-2 rounded-lg border border-[#EEEEEE] bg-white px-4 py-2.5 text-sm font-medium text-black shadow-sm transition-opacity hover:opacity-90"
          >
            <Package className="size-4 text-[#888888]" aria-hidden />
            Add products
          </Link>
          {showStorefrontLink ? (
            <Link
              href={APP_ROUTES.businessSettings}
              className="inline-flex items-center gap-2 rounded-lg border border-[#EEEEEE] bg-white px-4 py-2.5 text-sm font-medium text-black shadow-sm transition-opacity hover:opacity-90"
            >
              <Store className="size-4 text-[#888888]" aria-hidden />
              Storefront setup
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
