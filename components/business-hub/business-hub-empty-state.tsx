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
}: {
  period: "today" | "week";
  showStorefrontLink?: boolean;
  showThemeLink?: boolean;
  showUsersLink?: boolean;
  storefrontEnabled?: boolean;
}) {
  const label = period === "today" ? "today" : "this week";
  const tillHref = cashierFirstSaleActivateHref();
  const extras: { href: string; text: string }[] = [];
  if (showStorefrontLink) {
    extras.push({
      href: APP_ROUTES.businessSettings,
      text: storefrontEnabled ? "Storefront" : "Set up storefront",
    });
  }
  if (showThemeLink) {
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
      aria-label={`No sales ${label}`}
    >
      <p className="hub-empty-state-title">Ready when you are</p>
      <p className={cn("hub-empty-state-lede", HUB_MUTED)}>
        No sales {label} yet. Open the till, count the float (0 is fine), and
        ring the first one. This board updates as money comes in.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3">
        <Link
          href={tillHref}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[2px] bg-[var(--hub-accent)] px-5 text-[13px] font-semibold tracking-[0.01em] text-[var(--hub-paper)] transition-colors hover:bg-[var(--hub-accent-deep)] active:scale-[0.995] sm:h-10 sm:w-auto"
        >
          <ShoppingCart className="size-4" aria-hidden />
          Open till and take first sale
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
