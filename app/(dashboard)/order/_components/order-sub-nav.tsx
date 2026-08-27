"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, ShoppingCart } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

const TABS = [
  {
    href: APP_ROUTES.order,
    label: "New order",
    hint: "Build & send POs",
    icon: ShoppingCart,
  },
  {
    href: APP_ROUTES.orderReceive,
    label: "Confirm orders",
    hint: "Receive & post supply",
    icon: ClipboardCheck,
  },
] as const;

export function OrderSubNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn("grid grid-cols-2 gap-1 p-1", className)}
      aria-label="Order pages"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === APP_ROUTES.orderReceive
            ? pathname.startsWith(APP_ROUTES.orderReceive)
            : pathname === tab.href || pathname.startsWith(`${tab.href}?`);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "group relative flex min-h-[3.25rem] flex-col justify-center rounded-lg px-3 py-2.5 transition-[background-color,box-shadow,color] duration-200 sm:min-h-[3.5rem] sm:flex-row sm:items-center sm:gap-3 sm:px-4",
              active
                ? "bg-[var(--order-ink,#15231f)] text-white shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_12%,transparent)]"
                : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)] hover:text-[var(--order-ink,#15231f)]",
            )}
          >
            <span className="flex items-center gap-2">
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-transform duration-200 group-hover:scale-105",
                  active ? "text-[color-mix(in_srgb,#fff_88%,transparent)]" : "",
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
                  : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]",
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
