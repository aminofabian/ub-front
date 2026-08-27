"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Headset,
  LayoutDashboard,
  Mail,
  Sparkles,
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
    href: APP_ROUTES.superAdminDashboard,
    label: "Overview",
    hint: "Fleet pulse",
    icon: LayoutDashboard,
    match: (p) => p === APP_ROUTES.superAdminDashboard,
  },
  {
    href: APP_ROUTES.superAdminBusinesses,
    label: "Tenants",
    hint: "Provision & manage",
    icon: Building2,
    match: (p) =>
      p === APP_ROUTES.superAdminBusinesses ||
      p.startsWith(`${APP_ROUTES.superAdminBusinesses}/`),
  },
  {
    href: APP_ROUTES.superAdminAdoptions,
    label: "Adoptions",
    hint: "Kiosk Pay & domains",
    icon: Sparkles,
    match: (p) => p.startsWith(APP_ROUTES.superAdminAdoptions),
  },
  {
    href: APP_ROUTES.superAdminCampaigns,
    label: "Campaigns",
    hint: "Email nudges",
    icon: Mail,
    match: (p) => p.startsWith(APP_ROUTES.superAdminCampaigns),
  },
  {
    href: APP_ROUTES.superAdminSupport,
    label: "Support",
    hint: "Tenant inbox",
    icon: Headset,
    match: (p) => p.startsWith(APP_ROUTES.superAdminSupport),
  },
];

export function SuperAdminHubNav({
  className,
}: {
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "grid grid-cols-2 gap-1 p-1 sm:grid-cols-3 lg:grid-cols-5",
        className,
      )}
      aria-label="Console pages"
    >
      {HUB_TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "group relative flex min-h-[3.25rem] flex-col justify-center rounded-lg px-3 py-2.5 transition-[background-color,box-shadow,color] duration-200 sm:min-h-[3.5rem] sm:flex-row sm:items-center sm:gap-3 sm:px-4",
              active
                ? "bg-[var(--sa-ink,#0f172a)] text-white shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_12%,transparent)]"
                : "text-[color-mix(in_srgb,var(--sa-ink,#0f172a)_62%,transparent)] hover:bg-[color-mix(in_srgb,var(--sa-ink,#0f172a)_4%,transparent)] hover:text-[var(--sa-ink,#0f172a)]",
            )}
          >
            <span className="flex items-center gap-2">
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-transform duration-200 group-hover:scale-105",
                  active
                    ? "text-[color-mix(in_srgb,#fff_88%,transparent)]"
                    : "text-[var(--sa-accent,#6366f1)]",
                )}
                aria-hidden
              />
              <span className="text-[13px] font-semibold tracking-[-0.01em] sm:text-sm">
                {tab.label}
              </span>
            </span>
            <span
              className={cn(
                "mt-0.5 hidden text-[11px] sm:ml-auto sm:mt-0 sm:block",
                active
                  ? "text-[color-mix(in_srgb,#fff_62%,transparent)]"
                  : "text-[color-mix(in_srgb,var(--sa-ink,#0f172a)_42%,transparent)]",
              )}
            >
              {tab.hint}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
