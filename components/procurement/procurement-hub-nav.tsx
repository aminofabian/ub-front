"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  PackagePlus,
  ShoppingCart,
  Truck,
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

/** Buying pages: order, confirm, record delivery, suppliers. */
const HUB_TABS: HubTab[] = [
  {
    href: APP_ROUTES.order,
    label: "New order",
    hint: "Build & send purchase orders",
    icon: ShoppingCart,
    match: (p) =>
      p === APP_ROUTES.order || p.startsWith(`${APP_ROUTES.order}?`),
  },
  {
    href: APP_ROUTES.orderReceive,
    label: "Confirm supply",
    hint: "Receive goods against open orders",
    icon: ClipboardCheck,
    match: (p) => p.startsWith(APP_ROUTES.orderReceive),
  },
  {
    href: APP_ROUTES.purchasingAddSupplies,
    label: "Supplies",
    hint: "Delivery ledger & bills",
    icon: PackagePlus,
    match: (p) =>
      p === APP_ROUTES.purchasingAddSupplies ||
      p.startsWith(`${APP_ROUTES.purchasingAddSupplies}?`) ||
      p.startsWith(`${APP_ROUTES.purchasingAddSupplies}/`),
  },
  {
    href: APP_ROUTES.suppliers,
    label: "Suppliers",
    hint: "Vendor directory",
    icon: Truck,
    match: (p) => p.startsWith(APP_ROUTES.suppliers),
  },
];

export const PROCUREMENT_VARS = {
  ["--pos-primary" as string]: "#0f766e",
  ["--order-ink" as string]: "#15231f",
  ["--order-shelf" as string]: "#f3f6f5",
  ["--order-slip" as string]: "#ffffff",
} as const;

export function ProcurementHubNav({
  className,
  columns = 4,
}: {
  className?: string;
  columns?: 2 | 4;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn("flex flex-wrap items-stretch divide-x divide-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]", className)}
      aria-label="Buying flow"
    >
      {HUB_TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={tab.hint}
            className={cn(
              "group relative flex h-10 min-w-0 flex-1 items-center justify-center gap-2 px-2.5 transition-colors duration-150 sm:justify-start sm:px-3",
              columns === 2 ? "min-w-[50%]" : "",
              active
                ? "bg-white text-[var(--pos-primary,#0f766e)]"
                : "bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)] hover:text-[var(--order-ink,#15231f)]",
            )}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--pos-primary,#0f766e)]"
              />
            ) : null}
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate text-[13px] font-semibold tracking-[-0.02em]">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
