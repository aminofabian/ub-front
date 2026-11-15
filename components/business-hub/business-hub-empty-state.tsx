"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import { cashierFirstSaleActivateHref } from "@/lib/first-sale-activate";
import { cn } from "@/lib/utils";

export function BusinessHubEmptyState({
  period,
  showStorefrontLink = false,
  showThemeLink = false,
  showUsersLink = false,
  storefrontEnabled = false,
  food = null,
}: {
  period: "today" | "week";
  showStorefrontLink?: boolean;
  showThemeLink?: boolean;
  showUsersLink?: boolean;
  storefrontEnabled?: boolean;
  /**
   * A restaurant, café or bar. Its first sale is an order from the floor or the counter, not a
   * scan at the barcode till, and its next jobs are its menu, not a storefront.
   */
  food?: { tables: boolean; canManageMenu: boolean } | null;
}) {
  const label = period === "today" ? "today" : "this week";
  const tillHref = cashierFirstSaleActivateHref();
  const extras: { href: string; text: string }[] = [];
  if (food) {
    extras.push({ href: APP_ROUTES.restaurantMenu, text: food.canManageMenu ? "Add to the menu" : "See the menu" });
    extras.push({ href: `${APP_ROUTES.restaurantMenu}/print`, text: "Print the menu" });
    if (food.canManageMenu) {
      extras.push({ href: `${APP_ROUTES.restaurantMenu}/qr`, text: "QR codes" });
    }
  } else if (showStorefrontLink) {
    extras.push({
      href: APP_ROUTES.businessSettings,
      text: storefrontEnabled ? "Storefront" : "Set up storefront",
    });
  }
  if (showThemeLink && !food) {
    extras.push({ href: APP_ROUTES.businessThemes, text: "Change look" });
  }
  if (showUsersLink) {
    extras.push({ href: APP_ROUTES.users, text: "Add staff" });
  }

  return (
    <section
      className={cn(
        HUB_SURFACE,
        "hub-empty-state border-x-0 border-t-0 px-5 py-8 sm:px-10 sm:py-12",
      )}
      aria-label={food ? `No orders ${label}` : `No sales ${label}`}
    >
      <p className="hub-empty-state-title">Ready when you are</p>
      <p className={cn("hub-empty-state-lede", HUB_MUTED)}>
        {food
          ? `No orders ${label} yet. ${food.tables ? "Seat a table or ring an order at the counter" : "Ring an order at the counter"}, take the money, and this board fills in as it comes.`
          : `No sales ${label} yet. Open the till, count the float (0 is fine), and ring the first one. This board updates as money comes in.`}
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3">
        <Link
          href={food ? (food.tables ? APP_ROUTES.restaurantFloor : APP_ROUTES.restaurantCounter) : tillHref}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[2px] bg-[var(--hub-accent)] px-5 text-[13px] font-semibold tracking-[0.01em] text-[var(--hub-paper)] transition-colors hover:bg-[var(--hub-accent-deep)] active:scale-[0.995] sm:h-10 sm:w-auto"
        >
          <ShoppingCart className="size-4" aria-hidden />
          {food ? "Take your first order" : "Open till and take first sale"}
        </Link>
        {extras.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-0.5">
            {extras.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[13px] font-medium text-[var(--hub-accent)] underline-offset-4 hover:underline"
              >
                {item.text}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
