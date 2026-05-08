"use client";

import {
  Building2,
  CircleDollarSign,
  LayoutGrid,
  Package,
  PackagePlus,
} from "lucide-react";

import { DashboardPageHero, DashboardQuickLinks } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type Props = {
  itemTypeCount: number;
  onCreateNew: () => void;
};

export function ProductHeroHeader({ itemTypeCount, onCreateNew }: Props) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border border-border/70 p-3 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.04] sm:p-3",
        "bg-gradient-to-br from-card via-card to-primary/[0.03] backdrop-blur-sm dark:from-card/95 dark:via-card/90 dark:to-primary/[0.04] dark:ring-white/[0.06]",
      )}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 size-28 rounded-full bg-primary/[0.05] blur-2xl" aria-hidden />
      <header className="relative space-y-2">
        <DashboardPageHero compact icon={Package} eyebrow="Catalog" title="Products" description={null} />
        <div className="hidden sm:flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <DashboardQuickLinks
            compact
            links={[
              { href: APP_ROUTES.categories, label: "Categories", desc: "Tree & aisles", icon: LayoutGrid },
              { href: APP_ROUTES.suppliers, label: "Suppliers", desc: "Costs & links", icon: Building2 },
              { href: APP_ROUTES.pricing, label: "Pricing", desc: "Rules & sell price", icon: CircleDollarSign },
            ]}
          />
          <Button type="button" className="h-9 shrink-0 gap-1.5 rounded-lg px-4 text-sm shadow-md shadow-primary/15"
            disabled={itemTypeCount === 0} onClick={onCreateNew}>
            <PackagePlus className="size-3.5" /> New product
          </Button>
        </div>
      </header>
    </div>
  );
}
