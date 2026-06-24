"use client";

import Link from "next/link";
import { Receipt, ShoppingBasket } from "lucide-react";

import { cn } from "@/lib/utils";

/** Bottom inset for content above the grocery tab bar + safe area. */
export const GROCERY_TAB_BAR_CLEARANCE =
  "calc(4.75rem + env(safe-area-inset-bottom, 0px))";

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
      className="grocery-bottom-nav pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] pt-2 sm:px-5"
    >
      <div
        className={cn(
          "tablet-bottom-nav-dock pointer-events-auto flex w-full max-w-md items-stretch justify-between gap-1",
          "rounded-[1.65rem] border border-white/25 bg-background/80 px-1.5 py-1.5",
          "shadow-[0_12px_48px_-14px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.04)_inset]",
          "backdrop-blur-2xl backdrop-saturate-[1.8]",
          "dark:border-white/10 dark:bg-background/70",
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "tablet-nav-tab flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 transition-colors",
                "active:scale-[0.97]",
                isActive && "tablet-nav-tab-active",
              )}
            >
              <span
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-xl transition-all duration-200 sm:size-10",
                  isActive && "scale-105",
                )}
              >
                {isActive ? (
                  <span
                    className="absolute inset-0 rounded-xl bg-primary/15 ring-1 ring-primary/25"
                    aria-hidden
                  />
                ) : null}
                <Icon
                  className={cn(
                    "relative size-[1.15rem] sm:size-5",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                  strokeWidth={isActive ? 2.25 : 2}
                  aria-hidden
                />
              </span>
              <span
                className={cn(
                  "max-w-[4.5rem] truncate text-[9px] font-semibold leading-none sm:text-[10px]",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
