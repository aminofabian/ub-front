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
    icon: ShoppingCart,
  },
  {
    href: APP_ROUTES.orderReceive,
    label: "Confirm orders",
    icon: ClipboardCheck,
  },
] as const;

export function OrderSubNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex flex-wrap gap-1 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] pb-2",
        className,
      )}
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
              "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[12px] font-semibold transition-colors",
              active
                ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-primary,#0f766e)]"
                : "text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
