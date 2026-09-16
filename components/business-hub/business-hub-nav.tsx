"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CreditCard,
  Settings,
  SlidersHorizontal,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

export type BusinessHubTab = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

export const BUSINESS_HUB_TABS: BusinessHubTab[] = [
  {
    href: APP_ROUTES.business,
    label: "Pulse",
    hint: "Revenue & till",
    icon: Activity,
    match: (p) =>
      p === APP_ROUTES.business || p.startsWith(`${APP_ROUTES.business}?`),
  },
  {
    href: APP_ROUTES.businessSettings,
    label: "Settings",
    hint: "Profile & storefront",
    icon: Settings,
    match: (p) => p.startsWith(APP_ROUTES.businessSettings),
  },
  {
    href: APP_ROUTES.paymentsSettings,
    label: "Payments",
    hint: "Gateways & payouts",
    icon: CreditCard,
    match: (p) => p.startsWith("/payments"),
  },
  {
    href: APP_ROUTES.businessConfiguration,
    label: "Configuration",
    hint: "How the shop runs",
    icon: SlidersHorizontal,
    match: (p) =>
      p.startsWith(APP_ROUTES.businessConfiguration) ||
      p.startsWith(APP_ROUTES.businessBranding) ||
      p.startsWith(APP_ROUTES.businessThemes) ||
      p.startsWith(APP_ROUTES.businessMobile) ||
      p.startsWith(APP_ROUTES.businessDomains),
  },
  {
    href: APP_ROUTES.store,
    label: "Store",
    hint: "Store room",
    icon: Warehouse,
    match: (p) =>
      p === APP_ROUTES.store || p.startsWith(`${APP_ROUTES.store}/`),
  },
  {
    href: APP_ROUTES.users,
    label: "Users",
    hint: "Staff & access",
    icon: Users,
    match: (p) => p.startsWith(APP_ROUTES.users),
  },
];

/** Resolve a hub page's display copy, honouring the first-run rename of Pulse. */
export function hubTabCopy(tab: BusinessHubTab, setupHome: boolean) {
  const isHome = tab.href === APP_ROUTES.business;
  if (!isHome || !setupHome) return tab;
  return {
    ...tab,
    label: "Shop",
    hint: "Open the floor",
  };
}

/**
 * Tablet and up: the hub's pages as a horizontal strip. Phones reach the same
 * pages through the identity row's menu, so this never renders below `sm`.
 */
export function BusinessHubNav({
  className,
  setupHome = false,
}: {
  className?: string;
  setupHome?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label="Your shop pages"
    >
      {BUSINESS_HUB_TABS.map((tab) => {
        const copy = hubTabCopy(tab, setupHome);
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={copy.hint}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-9 flex-1 items-center gap-1.5 px-3 transition-colors",
              "active:scale-[0.99]",
              active
                ? "bg-[var(--hub-ink,#141414)] text-white"
                : "text-[color-mix(in_srgb,var(--hub-ink,#141414)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--hub-ink,#141414)_4%,transparent)] hover:text-[var(--hub-ink,#141414)]",
            )}
          >
            <Icon
              className={cn(
                "size-3.5 shrink-0 transition-colors",
                active
                  ? "text-[color-mix(in_srgb,#fff_88%,transparent)]"
                  : "text-[var(--hub-accent,#0f766e)]",
              )}
              strokeWidth={active ? 2.25 : 2}
              aria-hidden
            />
            <span className="truncate text-[13px] font-medium tracking-[-0.015em]">
              {copy.label}
            </span>
            <span
              className={cn(
                "ml-auto hidden truncate text-[10px] tracking-[-0.01em] xl:block",
                active
                  ? "text-[color-mix(in_srgb,#fff_62%,transparent)]"
                  : "text-[color-mix(in_srgb,var(--hub-ink,#141414)_40%,transparent)]",
              )}
            >
              {copy.hint}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
