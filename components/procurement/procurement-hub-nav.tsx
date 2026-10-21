"use client";

import type { ReactNode } from "react";
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
  ["--pos-primary" as string]: "#1D4B3B",
  ["--order-ink" as string]: "#121A16",
  ["--order-shelf" as string]: "#FCFAF5",
  ["--order-slip" as string]: "#FCFAF5",
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
      p.startsWith(`${APP_ROUTES.purchasingAddSupplies}/`) ||
      p.startsWith(APP_ROUTES.purchasingApAging),
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
  end,
}: {
  className?: string;
  /** Trailing control on the journey row (e.g. receive path fork). */
  end?: ReactNode;
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
          {end ? (
            <div className="min-w-0 shrink">{end}</div>
          ) : (
            <p className="text-[10px] font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
              {activeIndex >= 0
                ? `${steps[activeIndex]?.label} · ${activeIndex + 1}/${steps.length}`
                : "Order → receive → walk-in"}
            </p>
          )}
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
      <div className="sm:hidden">
        <ol className="grid list-none grid-cols-4 gap-1 p-1.5">
          {steps.map((step, index) => {
            const active = index === activeIndex;
            const Icon = step.icon;
            return (
              <li key={step.href} className="min-w-0">
                <Link
                  href={step.href}
                  title={`${step.label}: ${step.hint}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 transition-transform duration-150 active:scale-[0.97]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2",
                    active
                      ? "bg-[#0f766e] text-white"
                      : "text-[#344054] active:bg-[#e9f5f1]",
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                  <span className="max-w-full truncate text-[11px] font-semibold tracking-[-0.01em]">
                    {step.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        {end ? (
          <div className="flex justify-center border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3 py-1.5">
            {end}
          </div>
        ) : null}
      </div>

      {/* sm+: one horizontal row of pills + optional path fork. */}
      <ol className="m-0 hidden list-none flex-wrap items-center gap-1.5 px-4 py-2.5 sm:flex">
        <li className="hidden sm:block">
          <p className="pr-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
            Buying journey
          </p>
        </li>
        {steps.map((step, index) => {
          const active = index === activeIndex;
          const past = activeIndex > index;
          return (
            <li key={step.href} className="min-w-0">
              <Link
                href={step.href}
                title={`${step.label}: ${step.hint}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-[2px] px-3 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-[#e6f4f0]"
                    : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-[2px] text-[11px] font-semibold tabular-nums",
                    active
                      ? "bg-[#0f766e] text-white"
                      : past
                        ? "bg-[#d9f0eb] text-[#0f766e]"
                        : "border border-[#e6eaec] text-[#98a2b3]",
                  )}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "truncate tracking-[-0.01em]",
                    active
                      ? "font-semibold text-[#0f766e]"
                      : "font-medium text-[#667085]",
                  )}
                >
                  {step.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="ml-auto flex min-w-0 shrink-0 items-center self-center">
          {end ? (
            end
          ) : (
            <p className="text-[12px] font-medium tabular-nums text-[#0f766e]">
              {activeIndex >= 0
                ? `Step ${activeIndex + 1} of ${steps.length}`
                : `${steps.length} stops`}
            </p>
          )}
        </li>
      </ol>
    </nav>
  );
}
