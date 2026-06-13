"use client";

import {
  CircleDollarSign,
  LayoutGrid,
  Package,
  PackagePlus,
  Plus,
  Truck,
} from "lucide-react";

import {
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { supBtnPrimary } from "./supplier-ui-tokens";

const QUICK_LINKS = [
  {
    href: APP_ROUTES.purchasingAddSupplies,
    label: "Supplies",
    desc: "Receipts",
    icon: PackagePlus,
  },
  {
    href: APP_ROUTES.products,
    label: "Products",
    desc: "Catalog",
    icon: Package,
  },
  {
    href: APP_ROUTES.categories,
    label: "Categories",
    desc: "Browse",
    icon: LayoutGrid,
  },
  {
    href: APP_ROUTES.purchasingIntelligence,
    label: "Intelligence",
    desc: "Insights",
    icon: CircleDollarSign,
  },
] as const;

function HeaderActions({
  canWrite,
  canOpenNewSupply,
  listLoadingInitial,
  onNewSupplier,
  onNewSupply,
  dense = false,
}: {
  canWrite: boolean;
  canOpenNewSupply: boolean;
  listLoadingInitial: boolean;
  onNewSupplier: () => void;
  onNewSupply: () => void;
  dense?: boolean;
}) {
  if (!canWrite && !canOpenNewSupply) return null;

  return (
    <div className={cn("flex shrink-0 flex-wrap items-center", dense ? "gap-1.5" : "gap-2")}>
      {canOpenNewSupply ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            "rounded-xl font-medium shadow-sm",
            dense ? "h-8 gap-1 px-2.5 text-xs" : "h-9 gap-1.5 px-3 text-sm",
          )}
          onClick={onNewSupply}
        >
          <PackagePlus className={dense ? "size-3.5" : "size-4"} aria-hidden />
          {dense ? "Supply" : "New supply"}
        </Button>
      ) : null}
      {canWrite ? (
        <Button
          type="button"
          size="sm"
          className={cn(
            supBtnPrimary,
            dense ? "h-8 gap-1 px-2.5 text-xs" : "h-9 gap-1.5 px-3 text-sm",
          )}
          disabled={listLoadingInitial}
          onClick={onNewSupplier}
        >
          <Plus className={dense ? "size-3.5" : "size-4"} aria-hidden />
          {dense ? "Supplier" : "New supplier"}
        </Button>
      ) : null}
    </div>
  );
}

export function SupplierPageHeader({
  canWrite,
  canOpenNewSupply,
  listLoadingInitial,
  onNewSupplier,
  onNewSupply,
}: {
  canWrite: boolean;
  canOpenNewSupply: boolean;
  listLoadingInitial: boolean;
  onNewSupplier: () => void;
  onNewSupply: () => void;
}) {
  return (
    <header className="min-w-0 shrink-0 space-y-2 border-b border-border/50 pb-3 sm:space-y-3 sm:pb-4">
      <div className="hidden xl:block">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <DashboardPageHero
              compact
              icon={Truck}
              eyebrow="Purchasing"
              title="Suppliers"
              description={
                <span className="hidden text-sm leading-relaxed text-muted-foreground lg:inline">
                  Vendor directory, catalog links, and purchase history.
                </span>
              }
            />
          </div>
          <HeaderActions
            canWrite={canWrite}
            canOpenNewSupply={canOpenNewSupply}
            listLoadingInitial={listLoadingInitial}
            onNewSupplier={onNewSupplier}
            onNewSupply={onNewSupply}
            dense
          />
        </div>
        <div className="mt-2">
          <DashboardQuickLinks links={[...QUICK_LINKS]} compact />
        </div>
      </div>

      <div className="space-y-3 xl:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <DashboardPageHero
            compact
            icon={Truck}
            eyebrow="Purchasing"
            title="Suppliers"
            description={
              <span className="text-sm leading-relaxed text-muted-foreground">
                Vendor directory and catalog links.
              </span>
            }
          />
          <HeaderActions
            canWrite={canWrite}
            canOpenNewSupply={canOpenNewSupply}
            listLoadingInitial={listLoadingInitial}
            onNewSupplier={onNewSupplier}
            onNewSupply={onNewSupply}
          />
        </div>
        <DashboardQuickLinks links={[...QUICK_LINKS]} compact />
      </div>
    </header>
  );
}
