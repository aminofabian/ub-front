"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CreditCard,
  Settings,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type HubTab = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const HUB_TABS: HubTab[] = [
  {
    href: APP_ROUTES.business,
    label: "Pulse",
    hint: "Revenue & till",
    icon: Activity,
    match: (p) => p === APP_ROUTES.business || p.startsWith(`${APP_ROUTES.business}?`),
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
    href: APP_ROUTES.users,
    label: "Users",
    hint: "Staff & access",
    icon: Users,
    match: (p) => p.startsWith(APP_ROUTES.users),
  },
];

export function BusinessHubNav({
  className,
  columns = 4,
  setupHome = false,
}: {
  className?: string;
  columns?: 2 | 4;
  setupHome?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "grid gap-1 p-1",
        columns === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
        className,
      )}
      aria-label="Your shop pages"
    >
      {HUB_TABS.map((tab) => {
        const isHome = tab.href === APP_ROUTES.business;
        const label =
          isHome && setupHome ? "Shop" : tab.label;
        const hint =
          isHome && setupHome ? "Open the floor" : tab.hint;
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "group relative flex min-h-[3.25rem] flex-col justify-center rounded-lg px-3 py-2.5 transition-[background-color,box-shadow,color] duration-200 sm:min-h-[3.5rem] sm:flex-row sm:items-center sm:gap-3 sm:px-4",
              active
                ? "bg-[var(--hub-ink,#141414)] text-white shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_12%,transparent)]"
                : "text-[color-mix(in_srgb,var(--hub-ink,#141414)_62%,transparent)] hover:bg-[color-mix(in_srgb,var(--hub-ink,#141414)_4%,transparent)] hover:text-[var(--hub-ink,#141414)]",
            )}
          >
            <span className="flex items-center gap-2">
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-transform duration-200 group-hover:scale-105",
                  active ? "text-[color-mix(in_srgb,#fff_88%,transparent)]" : "text-[var(--hub-accent,#B08D48)]",
                )}
                aria-hidden
              />
              <span className="text-[13px] font-semibold tracking-[-0.01em] sm:text-sm">
                {label}
              </span>
            </span>
            <span
              className={cn(
                "mt-0.5 hidden text-[11px] sm:ml-auto sm:mt-0 sm:block",
                active
                  ? "text-[color-mix(in_srgb,#fff_62%,transparent)]"
                  : "text-[color-mix(in_srgb,var(--hub-ink,#141414)_42%,transparent)]",
              )}
            >
              {hint}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
