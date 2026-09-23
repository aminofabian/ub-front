"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  Package,
  PackagePlus,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
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
    hint: "Directory, inherit from marketplace & wallets",
    icon: Truck,
    match: (p) =>
      p.startsWith(APP_ROUTES.suppliers) ||
      p.startsWith(APP_ROUTES.findSuppliers),
  },
];

/** Stock floor: Order → Receive → Walk-in. Thumb-first, no ledger noise. */
const STOCK_FLOOR_STEPS: HubStep[] = [
  {
    href: APP_ROUTES.order,
    label: "Order",
    beat: "Build PO",
    hint: "Pick supplier products and send",
    icon: ShoppingCart,
    match: (p) =>
      p === APP_ROUTES.order || p.startsWith(`${APP_ROUTES.order}?`),
  },
  {
    href: APP_ROUTES.orderReceive,
    label: "Receive",
    beat: "Unpack",
    hint: "Confirm arrival and put into stock",
    icon: ClipboardCheck,
    match: (p) => p.startsWith(APP_ROUTES.orderReceive),
  },
  {
    href: APP_ROUTES.purchasingAddSupplies,
    label: "Walk-in",
    beat: "No PO",
    hint: "Goods arrived without an order",
    icon: PackagePlus,
    match: (p) =>
      p === APP_ROUTES.purchasingAddSupplies ||
      p.startsWith(`${APP_ROUTES.purchasingAddSupplies}?`) ||
      p.startsWith(`${APP_ROUTES.purchasingAddSupplies}/`),
  },
];

export function ProcurementHubNav({
  className,
}: {
  className?: string;
  /** @deprecated Journey is always driven by role; kept for call-site compatibility. */
  columns?: 2 | 4;
}) {
  const pathname = usePathname();
  const { me } = useDashboard();
  const isStockManager =
    me?.role?.key?.trim().toLowerCase() === "stock_manager";
  const steps = isStockManager ? STOCK_FLOOR_STEPS : HUB_STEPS;
  const activeIndex = steps.findIndex((step) => step.match(pathname));

  if (isStockManager) {
    return (
      <nav
        className={cn("bg-white", className)}
        aria-label="Stock buying flow"
        style={PROCUREMENT_VARS}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--pos-primary,#0f766e)]">
            Buying
          </p>
          <p className="text-[10px] font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
            {activeIndex >= 0
              ? `${steps[activeIndex]?.label} · ${activeIndex + 1}/${steps.length}`
              : "Order → receive → walk-in"}
          </p>
        </div>

        <ol
          className="m-0 grid list-none grid-cols-3 p-1"
          style={{
            gap: "2px",
            background:
              "color-mix(in srgb, var(--order-ink, #15231f) 6%, white)",
          }}
        >
          {steps.map((step, index) => {
            const active = index === activeIndex;
            const past = activeIndex > index;
            const Icon = step.icon;
            return (
              <li key={step.href} className="min-w-0">
                <Link
                  href={step.href}
                  title={`${step.label}: ${step.hint}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors",
                    active
                      ? "bg-[var(--pos-primary,#0f766e)] text-white"
                      : "bg-white text-[var(--order-ink,#15231f)] hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]",
                  )}
                >
                  <span className="flex items-center gap-1">
                    <span
                      className={cn(
                        "inline-flex size-4 items-center justify-center text-[9px] font-bold tabular-nums",
                        active
                          ? "bg-white/20 text-white"
                          : past
                            ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_16%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]",
                      )}
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <Icon
                      className={cn(
                        "size-3.5",
                        active
                          ? "text-white"
                          : "text-[var(--pos-primary,#0f766e)]",
                      )}
                      aria-hidden
                    />
                  </span>
                  <span
                    className={cn(
                      "truncate text-[12px] font-semibold tracking-[-0.02em]",
                      active ? "text-white" : "text-[var(--order-ink,#15231f)]",
                    )}
                  >
                    {step.label}
                  </span>
                  <span
                    className={cn(
                      "truncate text-[9px] leading-none",
                      active
                        ? "text-white/75"
                        : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]",
                    )}
                  >
                    {step.beat}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

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
            ? `Step ${activeIndex + 1} of ${steps.length}`
            : `${steps.length} stops`}
        </p>
      </div>

      <ol className="m-0 grid list-none grid-cols-2 p-0 sm:grid-cols-4">
        {steps.map((step, index) => {
          const active = index === activeIndex;
          const past = activeIndex > index;
          const Icon = step.icon;
          const isLast = index === steps.length - 1;

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
