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
  shortLabel: string;
  hint: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const HUB_TABS: HubTab[] = [
  {
    href: APP_ROUTES.business,
    label: "Pulse",
    shortLabel: "Pulse",
    hint: "Revenue & till",
    icon: Activity,
    match: (p) =>
      p === APP_ROUTES.business || p.startsWith(`${APP_ROUTES.business}?`),
  },
  {
    href: APP_ROUTES.businessSettings,
    label: "Settings",
    shortLabel: "Settings",
    hint: "Profile & storefront",
    icon: Settings,
    match: (p) => p.startsWith(APP_ROUTES.businessSettings),
  },
  {
    href: APP_ROUTES.paymentsSettings,
    label: "Payments",
    shortLabel: "Pay",
    hint: "Gateways & payouts",
    icon: CreditCard,
    match: (p) => p.startsWith("/payments"),
  },
  {
    href: APP_ROUTES.businessConfiguration,
    label: "Configuration",
    shortLabel: "Config",
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
    shortLabel: "Users",
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
        // Phone: equal 5-up app tabs. Desktop: horizontal strip.
        "grid grid-cols-5 gap-0.5 sm:flex sm:gap-0.5 sm:overflow-x-auto sm:[-ms-overflow-style:none] sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden",
        columns === 2 ? "sm:grid sm:grid-cols-2 sm:overflow-visible" : "",
        className,
      )}
      aria-label="Your shop pages"
    >
      {HUB_TABS.map((tab) => {
        const isHome = tab.href === APP_ROUTES.business;
        const label = isHome && setupHome ? "Shop" : tab.label;
        const shortLabel = isHome && setupHome ? "Shop" : tab.shortLabel;
        const hint = isHome && setupHome ? "Open the floor" : tab.hint;
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={hint}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-none px-1 py-1.5 transition-colors",
              "sm:h-9 sm:min-h-0 sm:flex-1 sm:flex-row sm:gap-1.5 sm:px-3 sm:py-0",
              "active:scale-[0.98] sm:active:scale-100",
              active
                ? "bg-[var(--hub-ink,#141414)] text-white"
                : "text-[color-mix(in_srgb,var(--hub-ink,#141414)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--hub-ink,#141414)_4%,transparent)] hover:text-[var(--hub-ink,#141414)]",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors sm:size-3.5",
                active
                  ? "text-[color-mix(in_srgb,#fff_88%,transparent)]"
                  : "text-[var(--hub-accent,#0f766e)]",
              )}
              strokeWidth={active ? 2.25 : 2}
              aria-hidden
            />
            <span className="max-w-full truncate text-[9px] font-semibold leading-none tracking-[-0.01em] sm:hidden">
              {shortLabel}
            </span>
            <span className="hidden truncate text-[12px] font-medium tracking-[-0.015em] sm:inline sm:text-[13px]">
              {label}
            </span>
            <span
              className={cn(
                "ml-auto hidden truncate text-[10px] tracking-[-0.01em] xl:block",
                active
                  ? "text-[color-mix(in_srgb,#fff_62%,transparent)]"
                  : "text-[color-mix(in_srgb,var(--hub-ink,#141414)_40%,transparent)]",
              )}
            >
              {hint}
            </span>
            {active ? (
              <span
                className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[var(--hub-accent,#0f766e)]"
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
