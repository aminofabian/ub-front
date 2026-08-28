"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
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
      className={cn(HUB_SURFACE, "px-5 py-6 sm:px-7 sm:py-7")}
      aria-label={`No sales ${label}`}
    >
      <p
        className="text-xl font-medium tracking-tight text-[#141414] sm:text-2xl"
        style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
      >
        Products are on the shelf
      </p>
      <p className={cn("mt-1.5 max-w-lg text-sm leading-relaxed", HUB_MUTED)}>
        Nothing through the till {label}. Open the cashier when you are ready
        to sell. The pulse fills in as money moves.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href={APP_ROUTES.cashier}
          className="inline-flex items-center gap-2 rounded-lg bg-[#141414] px-3.5 py-2 text-sm font-medium text-[#F5E6C8] transition-opacity hover:opacity-90"
        >
          <ShoppingCart className="size-3.5" aria-hidden />
          Open the till
        </Link>
        {extras.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-[13px] font-medium text-[#8A6B2E] underline-offset-4 hover:underline"
          >
            {item.text}
          </Link>
        ))}
      </div>
    </section>
  );
}
