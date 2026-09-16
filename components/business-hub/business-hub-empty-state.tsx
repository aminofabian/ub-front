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
      className={cn(HUB_SURFACE, "px-4 py-5 sm:px-7 sm:py-7")}
      aria-label={`No sales ${label}`}
    >
      <p
        className="text-lg font-medium tracking-tight text-[#141414] sm:text-2xl"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Ready when you are
      </p>
      <p className={cn("mt-1.5 max-w-lg text-[13px] leading-relaxed sm:text-sm", HUB_MUTED)}>
        No sales {label} yet. Open the till, count the float (0 is fine), and
        ring the first one — this board updates as money comes in.
      </p>
      <div className="mt-4 flex flex-col gap-2.5 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
        <Link
          href={tillHref}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-none bg-[#0f766e] px-4 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 sm:h-auto sm:w-auto sm:rounded-none sm:px-3.5 sm:py-2 sm:text-sm sm:font-medium"
        >
          <ShoppingCart className="size-4 sm:size-3.5" aria-hidden />
          Open till & take first sale
        </Link>
        {extras.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-0.5">
            {extras.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[13px] font-medium text-[#0f766e] underline-offset-4 hover:underline"
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
