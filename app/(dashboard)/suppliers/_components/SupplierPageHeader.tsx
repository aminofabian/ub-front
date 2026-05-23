"use client";

import {
  CircleDollarSign,
  LayoutGrid,
  Package,
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

import { supBtnPrimary, supHeroGlowAccent, supHeroGlowPrimary, supHeroSection } from "./supplier-ui-tokens";

export function SupplierPageHeader({
  canWrite,
  listLoadingInitial,
  onNewSupplier,
}: {
  canWrite: boolean;
  listLoadingInitial: boolean;
  onNewSupplier: () => void;
}) {
  return (
    <section className={cn(supHeroSection, "shrink-0")}>
      <div className={supHeroGlowPrimary} aria-hidden />
      <div className={supHeroGlowAccent} aria-hidden />
      <div className="relative">
        <DashboardPageHero
          compact
          icon={Truck}
          eyebrow="Purchasing"
          title="Suppliers"
          description={
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Your vendor directory, commercial profiles, and product links in one
              workspace. Press{" "}
              <kbd className="rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground">
                /
              </kbd>{" "}
              to jump to search.
            </p>
          }
        />
        <div className="mt-5 flex flex-col gap-4 border-t border-border/45 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <DashboardQuickLinks
            compact
            links={[
              {
                href: APP_ROUTES.products,
                label: "Products",
                desc: "Link items",
                icon: Package,
              },
              {
                href: APP_ROUTES.categories,
                label: "Categories",
                desc: "Aisles",
                icon: LayoutGrid,
              },
              {
                href: APP_ROUTES.purchasingIntelligence,
                label: "Intelligence",
                desc: "Spend",
                icon: CircleDollarSign,
              },
            ]}
          />
          {canWrite ? (
            <Button
              type="button"
              className={cn(supBtnPrimary, "self-stretch sm:self-center")}
              disabled={listLoadingInitial}
              onClick={onNewSupplier}
            >
              <Plus className="size-4" aria-hidden />
              New supplier
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
