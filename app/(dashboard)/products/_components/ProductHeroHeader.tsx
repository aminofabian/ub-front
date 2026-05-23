"use client";

import {
  Building2,
  CircleDollarSign,
  Layers,
  LayoutGrid,
  Package,
  PackagePlus,
} from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type Props = {
  itemTypeCount: number;
  onCreateNew: () => void;
  onAddVariant?: () => void;
  canAddVariant?: boolean;
};

export function ProductHeroHeader({
  itemTypeCount,
  onCreateNew,
  onAddVariant,
  canAddVariant = true,
}: Props) {
  return (
    <section
      className={cn(
        DASHBOARD_SECTION_SURFACE,
        "relative overflow-hidden",
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-primary/[0.07] blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-1/3 size-32 rounded-full bg-amber-400/[0.06] blur-2xl"
        aria-hidden
      />
      <DashboardPageHero
        compact
        icon={Package}
        eyebrow="Catalog"
        title="Products"
        description="Browse parents, variant groups, and SKUs in one tree."
      />
      <div className="mt-5 flex flex-col gap-4 border-t border-border/50 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <DashboardQuickLinks
          compact
          links={[
            {
              href: APP_ROUTES.categories,
              label: "Categories",
              desc: "Tree & aisles",
              icon: LayoutGrid,
            },
            {
              href: APP_ROUTES.suppliers,
              label: "Suppliers",
              desc: "Costs & links",
              icon: Building2,
            },
            {
              href: APP_ROUTES.pricing,
              label: "Pricing",
              desc: "Rules & sell price",
              icon: CircleDollarSign,
            },
          ]}
        />
        <div className="flex flex-col gap-2 self-stretch sm:flex-row sm:items-center sm:self-center">
          {onAddVariant ? (
            <Button
              type="button"
              variant="outline"
              disabled={itemTypeCount === 0 || !canAddVariant}
              onClick={onAddVariant}
              className="h-10 min-h-10 shrink-0 gap-2 px-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <Layers className="size-4" aria-hidden />
              Add variant
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={itemTypeCount === 0}
            onClick={onCreateNew}
            className="h-10 min-h-10 shrink-0 gap-2 px-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <PackagePlus className="size-4" aria-hidden />
            New product
          </Button>
        </div>
      </div>
    </section>
  );
}
