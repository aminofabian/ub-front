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
        "flex gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        columns === 2 ? "sm:grid sm:grid-cols-2 sm:overflow-visible" : "",
        className,
      )}
      aria-label="Your shop pages"
    >
      {HUB_TABS.map((tab) => {
        const isHome = tab.href === APP_ROUTES.business;
        const label = isHome && setupHome ? "Shop" : tab.label;
        const hint = isHome && setupHome ? "Open the floor" : tab.hint;
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={hint}
            className={cn(
              "group relative flex h-8 shrink-0 items-center gap-1.5 rounded-none px-2.5 transition-colors sm:h-9 sm:flex-1 sm:px-3",
              active
                ? "bg-[var(--hub-ink,#141414)] text-white"
                : "text-[color-mix(in_srgb,var(--hub-ink,#141414)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--hub-ink,#141414)_4%,transparent)] hover:text-[var(--hub-ink,#141414)]",
            )}
          >
            <Icon
              className={cn(
                "size-3.5 shrink-0",
                active
                  ? "text-[color-mix(in_srgb,#fff_88%,transparent)]"
                  : "text-[var(--hub-accent,#B08D48)]",
              )}
              aria-hidden
            />
            <span className="truncate text-[12px] font-medium tracking-[-0.01em] sm:text-[13px]">
              {label}
            </span>
            <span
              className={cn(
                "ml-auto hidden truncate text-[10px] xl:block",
                active
                  ? "text-[color-mix(in_srgb,#fff_62%,transparent)]"
                  : "text-[color-mix(in_srgb,var(--hub-ink,#141414)_40%,transparent)]",
              )}
            >
              {hint}
            </span>
            {active ? (
              <span
                className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[var(--hub-accent,#B08D48)]"
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
