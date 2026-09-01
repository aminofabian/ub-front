"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Filter,
  Phone,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";

import { dashboardHintClass } from "@/components/dashboard-page-ui";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  CRM_PILL_ACTIVE,
  CRM_PILL_IDLE,
  CRM_RAIL,
} from "@/components/credits/customer-crm-ui";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  show?: boolean;
};

type DateOption = { id: string; label: string };

type Props = {
  dateOptions: DateOption[];
  datePreset: string;
  onDatePreset: (id: string) => void;
  periodLabel: string;
  outstandingOnly: boolean;
  onOutstandingOnly: (v: boolean) => void;
  originFilter: "all" | "inferred" | "verified";
  onOriginFilter: (v: "all" | "inferred" | "verified") => void;
  stats: { shown: number; totalOwed: string };
  canViewAnalytics: boolean;
  canReviewPaymentClaims: boolean;
};

export function CustomerCrmNavRail({
  dateOptions,
  datePreset,
  onDatePreset,
  periodLabel,
  outstandingOnly,
  onOutstandingOnly,
  originFilter,
  onOriginFilter,
  stats,
  canViewAnalytics,
  canReviewPaymentClaims,
}: Props) {
  const pathname = usePathname();

  const nav: NavItem[] = [
    { href: APP_ROUTES.customers, label: "Directory", icon: Users, show: true },
    {
      href: APP_ROUTES.customerSegments,
      label: "Segments",
      icon: Filter,
      show: canViewAnalytics,
    },
    {
      href: APP_ROUTES.analyticsCustomers,
      label: "Shoppers",
      icon: TrendingUp,
      show: canViewAnalytics,
    },
    { href: APP_ROUTES.customerPhones, label: "Phones", icon: Phone, show: true },
    { href: APP_ROUTES.creditsOnTab, label: "On tab", icon: Receipt, show: true },
    {
      href: APP_ROUTES.creditsPaymentClaims,
      label: "Claims",
      icon: Receipt,
      show: canReviewPaymentClaims,
    },
  ];

  return (
    <aside className={CRM_RAIL}>
      <div className="shrink-0 space-y-1 border-b border-border/50 p-3">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Workspace
        </p>
        <nav className="space-y-0.5" aria-label="Customer areas">
          {nav
            .filter((item) => item.show !== false)
            .map(({ href, label, icon: Icon }) => {
              const active =
                href === APP_ROUTES.customers
                  ? pathname === href
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors",
                    active ? CRM_PILL_ACTIVE : CRM_PILL_IDLE,
                  )}
                >
                  <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                  {label}
                </Link>
              );
            })}
        </nav>
      </div>

      <div className="shrink-0 space-y-2 border-b border-border/50 p-3">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Snapshot
        </p>
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/50 bg-card/80 px-2.5 py-2">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Shown
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {stats.shown}
            </dd>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/80 px-2.5 py-2">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Owed
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums leading-tight">
              {stats.totalOwed}
            </dd>
          </div>
        </dl>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Added
          </p>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Date filter">
            {dateOptions.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => onDatePreset(id)}
                className={cn(
                  "rounded-lg px-2 py-1 text-[11px] font-medium transition-colors",
                  datePreset === id ? CRM_PILL_ACTIVE : CRM_PILL_IDLE,
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className={cn(dashboardHintClass(), "mt-1.5 px-1")}>{periodLabel}</p>
        </div>

        <div>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Origin
          </p>
          <div className="inline-flex w-full rounded-xl border border-border/60 bg-muted/30 p-0.5 text-[11px] font-medium">
            {(
              [
                ["all", "All"],
                ["inferred", "Inferred"],
                ["verified", "Verified"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onOriginFilter(id)}
                className={cn(
                  "flex-1 rounded-lg px-2 py-1 transition-colors",
                  originFilter === id ? CRM_PILL_ACTIVE : CRM_PILL_IDLE,
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/50 bg-card/60 px-3 py-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={outstandingOnly}
            onChange={(e) => onOutstandingOnly(e.target.checked)}
            className="size-4 rounded border-input accent-[#8B6F3A]"
          />
          Outstanding tab only
        </label>
      </div>
    </aside>
  );
}
