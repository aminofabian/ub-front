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
      className={cn(
        HUB_SURFACE,
        "hub-rise relative overflow-hidden px-5 py-7 sm:px-8",
      )}
      aria-label="No sales yet"
    >
      <div className="relative mx-auto max-w-lg text-center">
        <p
          className="text-2xl font-medium tracking-tight text-[#141414]"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          No sales {label} yet
        </p>
        <p className={cn("mt-2 text-sm leading-relaxed", HUB_MUTED)}>
          This board wakes up the moment money moves. Add products, open the
          till, and the pulse, runway, and movers will fill in.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href={APP_ROUTES.salesQuick}
            className="inline-flex items-center gap-2 bg-[#141414] px-3.5 py-2 text-sm font-medium text-[#F5E6C8] transition-opacity hover:opacity-90"
          >
            <ShoppingCart className="size-3.5" aria-hidden />
            Record a sale
          </Link>
          <Link
            href={APP_ROUTES.products}
            className="inline-flex items-center gap-2 border border-[#E6E1D8] bg-white px-3.5 py-2 text-sm font-medium text-[#141414] transition-colors hover:border-[#B08D48] hover:text-[#8A6B2E]"
          >
            <Package className="size-3.5 text-[#888888]" aria-hidden />
            Add products
          </Link>
          {showStorefrontLink ? (
            <Link
              href={APP_ROUTES.businessSettings}
              className="inline-flex items-center gap-2 border border-[#E6E1D8] bg-white px-3.5 py-2 text-sm font-medium text-[#141414] transition-colors hover:border-[#B08D48] hover:text-[#8A6B2E]"
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
