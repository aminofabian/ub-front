"use client";

import {
  Building2,
  CircleDollarSign,
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

type Props = {
  itemTypeCount: number;
  onCreateNew: () => void;
};

export function ProductHeroHeader({ itemTypeCount, onCreateNew }: Props) {
  return (
    <section className={DASHBOARD_SECTION_SURFACE}>
      <DashboardPageHero
        compact
        icon={Package}
        eyebrow="Catalog"
        title="Products"
        description={null}
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
        <Button
          type="button"
          disabled={itemTypeCount === 0}
          onClick={onCreateNew}
          className="h-10 min-h-10 shrink-0 gap-2 self-stretch px-5 shadow-sm transition-shadow hover:shadow-md sm:self-center"
        >
          <PackagePlus className="size-4" aria-hidden />
          New product
        </Button>
      </div>
    </section>
  );
}
