"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  Package,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

export const PROCUREMENT_VARS = {
  ["--pos-primary" as string]: "#0f766e",
  ["--order-ink" as string]: "#15231f",
  ["--order-shelf" as string]: "#ffffff",
  ["--order-slip" as string]: "#ffffff",
} as const;

type HubStep = {
  href: string;
  label: string;
  beat: string;
  hint: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

/**
 * One buying journey:
 * Order (promise) → Receive (goods in) → Records (ledger + money) → Suppliers.
 * Advance deposit sits on Order (after save) and Records — not a rival tab.
 */
const HUB_STEPS: HubStep[] = [
  {
    href: APP_ROUTES.order,
    label: "Order",
    beat: "Promise",
    hint: "Build & send the purchase order",
    icon: ShoppingCart,
    match: (p) =>
      p === APP_ROUTES.order || p.startsWith(`${APP_ROUTES.order}?`),
  },
  {
    href: APP_ROUTES.orderReceive,
    label: "Receive",
    beat: "Goods in",
    hint: "Against an order, or walk-in with no PO",
    icon: ClipboardCheck,
    match: (p) => p.startsWith(APP_ROUTES.orderReceive),
  },
  {
    href: `${APP_ROUTES.purchasingAddSupplies}?filter=today`,
    label: "Records",
    beat: "Ledger",
    hint: "Deliveries, unpaid bills, advance deposit",
    icon: Package,
    match: (p) =>
      p === APP_ROUTES.purchasingAddSupplies ||
      p.startsWith(`${APP_ROUTES.purchasingAddSupplies}?`) ||
      p.startsWith(`${APP_ROUTES.purchasingAddSupplies}/`),
  },
  {
    href: APP_ROUTES.suppliers,
    label: "Suppliers",
    beat: "People",
    hint: "Vendor directory & wallets",
    icon: Truck,
    match: (p) => p.startsWith(APP_ROUTES.suppliers),
  },
];

export function ProcurementHubNav({
  className,
}: {
  className?: string;
  /** @deprecated Journey is always 4 beats; kept for call-site compatibility. */
  columns?: 2 | 4;
}) {
  const pathname = usePathname();
  const activeIndex = HUB_STEPS.findIndex((step) => step.match(pathname));

  return (
    <nav
      className={cn("bg-white", className)}
      aria-label="Buying journey"
      style={PROCUREMENT_VARS}
    >
      <div className="flex items-center justify-between gap-2 border-b border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] px-2.5 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
          Buying journey
        </p>
        <p className="text-[10px] font-medium tabular-nums text-[var(--pos-primary,#0f766e)]">
          {activeIndex >= 0
            ? `Step ${activeIndex + 1} of ${HUB_STEPS.length}`
            : `${HUB_STEPS.length} stops`}
        </p>
      </div>

      <ol className="m-0 grid list-none grid-cols-2 p-0 sm:grid-cols-4">
        {HUB_STEPS.map((step, index) => {
          const active = index === activeIndex;
          const past = activeIndex > index;
          const Icon = step.icon;
          const isLast = index === HUB_STEPS.length - 1;

          return (
            <li
              key={step.href}
              className={cn(
                "relative min-w-0 border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
                index < 2 && "border-b sm:border-b-0",
                !isLast && "sm:border-r",
                index % 2 === 0 && "border-r sm:border-r",
              )}
            >
              <Link
                href={step.href}
                title={`${step.label}: ${step.hint}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-full min-h-[3.25rem] flex-col justify-center gap-0.5 px-2.5 py-2 transition-colors duration-150",
                  active
                    ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]"
                    : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex size-5 shrink-0 items-center justify-center text-[10px] font-bold tabular-nums",
                      active
                        ? "bg-[var(--pos-primary,#0f766e)] text-white"
                        : past
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_18%,white)] text-[var(--pos-primary,#0f766e)]"
                          : "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]",
                    )}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0",
                      active
                        ? "text-[var(--pos-primary,#0f766e)]"
                        : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]",
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "truncate text-[13px] tracking-[-0.02em]",
                      active
                        ? "font-semibold text-[var(--order-ink,#15231f)]"
                        : "font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_68%,transparent)]",
                    )}
                  >
                    {step.label}
                  </span>
                </span>
                <span
                  className={cn(
                    "pl-[1.625rem] text-[10px] leading-tight",
                    active
                      ? "text-[var(--pos-primary,#0f766e)]"
                      : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]",
                  )}
                >
                  {step.beat}
                  <span className="hidden lg:inline"> · {step.hint}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
