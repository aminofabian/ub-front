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
      className={cn(
        "flex flex-wrap items-center gap-0.5 p-0.5",
        className,
      )}
      aria-label="Buying flow"
    >
      {HUB_TABS.map((tab, index) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <div key={tab.href} className="flex items-center gap-0.5">
            {index > 0 ? (
              <span
                aria-hidden
                className="hidden px-0.5 text-[10px] font-bold text-[color-mix(in_srgb,var(--pos-primary,#0f766e)_55%,transparent)] sm:inline"
              >
                →
              </span>
            ) : null}
            <Link
              href={tab.href}
              title={tab.hint}
              className={cn(
                "group relative flex h-8 items-center justify-center gap-1.5 rounded-md px-2 transition-[background-color,color] duration-150 sm:justify-start sm:px-2.5",
                columns === 2 ? "min-w-[calc(50%-0.125rem)] flex-1" : "",
                active
                  ? "bg-[var(--order-ink,#15231f)] text-white"
                  : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)] hover:text-[var(--order-ink,#15231f)]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold tabular-nums",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-primary,#0f766e)]",
                )}
              >
                {index + 1}
              </span>
              <Icon
                className={cn(
                  "size-3.5 shrink-0",
                  active ? "text-[color-mix(in_srgb,#fff_88%,transparent)]" : "",
                )}
                aria-hidden
              />
              <span className="truncate text-[12px] font-semibold tracking-[-0.01em]">
                {tab.label}
              </span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
