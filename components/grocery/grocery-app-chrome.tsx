"use client";

import Link from "next/link";
import { Receipt, ShoppingBasket } from "lucide-react";

import { cn } from "@/lib/utils";

/** Bottom inset for content above the grocery tab bar + safe area. */
export const GROCERY_TAB_BAR_CLEARANCE =
  "calc(2.75rem + env(safe-area-inset-bottom, 0px))";

type GroceryAppBottomNavProps = {
  activeTab: "counter" | "invoices";
};

export function GroceryAppBottomNav({ activeTab }: GroceryAppBottomNavProps) {
  const tabs = [
    {
      id: "counter" as const,
      label: "Counter",
      href: "/grocery",
      icon: ShoppingBasket,
    },
    {
      id: "invoices" as const,
      label: "Invoices",
      href: "/grocery/invoices",
      icon: Receipt,
    },
  ];

  return (
    <nav
      aria-label="Grocery navigation"
      className="grocery-bottom-nav pointer-events-none absolute inset-x-0 bottom-0 z-40 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="pointer-events-auto flex w-full items-stretch divide-x divide-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "tablet-nav-tab relative flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 px-2 transition-colors",
                isActive
                  ? "tablet-nav-tab-active bg-white text-[var(--pos-primary,#0f766e)]"
                  : "bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)] hover:text-[var(--order-ink,#15231f)]",
              )}
            >
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--pos-primary,#0f766e)]"
                />
              ) : null}
              <Icon className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              <span className="truncate text-[12px] font-semibold tracking-[-0.02em]">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
