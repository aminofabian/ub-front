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
      className={cn(HUB_SURFACE, "relative overflow-hidden px-5 py-8 sm:px-8")}
      aria-label="No sales yet"
    >
      <div
        className="pointer-events-none absolute -right-10 top-0 size-40 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(176,141,72,0.18) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-lg text-center">
        <p
          className="text-2xl font-medium tracking-tight text-black"
          style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
        >
          No sales {label} yet
        </p>
        <p className={cn("mt-2 text-sm leading-relaxed", HUB_MUTED)}>
          This board wakes up the moment money moves. Add products, open the
          till, and the pulse, runway, and movers will fill in.
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
