"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useDashboard } from "@/components/dashboard-provider";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

export function ButcherNav() {
  const pathname = usePathname();
  const mounted = useClientMounted();
  const { canViewCategories, canViewAnalytics, canViewSuppliers } = useDashboard();

  const tabs = [
    { href: APP_ROUTES.butcher, label: "Counter", exact: true },
    ...(mounted && canViewCategories
      ? [{ href: APP_ROUTES.butcherProducts, label: "Products", exact: false }]
      : []),
    ...(mounted && canViewAnalytics
      ? [{ href: APP_ROUTES.butcherAnalytics, label: "Analytics", exact: false }]
      : []),
    ...(mounted && canViewSuppliers
      ? [{ href: APP_ROUTES.butcherSuppliers, label: "Suppliers", exact: false }]
      : []),
  ];

  return (
    <nav
      className="flex gap-1 border-b border-[rgb(var(--bp-border)/0.9)] px-3 sm:px-4"
      aria-label="Butcher"
    >
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative -mb-px border-b-2 px-3 py-2.5 text-xs font-semibold transition sm:text-sm",
              active
                ? "border-[var(--pos-primary)] text-[var(--pos-primary)]"
                : "border-transparent text-[rgb(var(--bp-fg-muted))] hover:text-[rgb(var(--bp-fg-soft))]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
