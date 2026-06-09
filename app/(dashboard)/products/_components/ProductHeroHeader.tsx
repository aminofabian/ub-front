"use client";

import {
  Building2,
  CircleDollarSign,
  Layers,
  LayoutGrid,
  PackagePlus,
} from "lucide-react";

import { DashboardQuickLinks } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";

type Props = {
  itemTypeCount: number;
  onCreateNew: () => void;
  onAddVariant?: () => void;
  canAddVariant?: boolean;
};

const quickLinks = [
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
] as const;

export function ProductHeroHeader({
  itemTypeCount,
  onCreateNew,
  onAddVariant,
  canAddVariant = true,
}: Props) {
  return (
    <>
      {/* Tablet / iPad — shell header already shows the page title */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 2xl:hidden">
        <DashboardQuickLinks compact links={[...quickLinks]} />
        {onAddVariant ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={itemTypeCount === 0 || !canAddVariant}
            onClick={onAddVariant}
            className="h-8 shrink-0 gap-1.5 px-3 text-xs shadow-sm"
          >
            <Layers className="size-3.5" aria-hidden />
            Add variant
          </Button>
        ) : null}
      </div>

      {/* Wide desktop — actions only (shell header shows page title) */}
      <div className="hidden shrink-0 flex-wrap items-center justify-between gap-2 2xl:flex">
        <DashboardQuickLinks compact links={[...quickLinks]} />
        <div className="flex items-center gap-2">
          {onAddVariant ? (
            <Button
              type="button"
              variant="outline"
              disabled={itemTypeCount === 0 || !canAddVariant}
              onClick={onAddVariant}
              className="h-10 shrink-0 gap-2 px-5 shadow-sm"
            >
              <Layers className="size-4" aria-hidden />
              Add variant
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={itemTypeCount === 0}
            onClick={onCreateNew}
            className="h-10 shrink-0 gap-2 px-5 shadow-sm"
          >
            <PackagePlus className="size-4" aria-hidden />
            New product
          </Button>
        </div>
      </div>
    </>
  );
}
