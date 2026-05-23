"use client";

import {
  BarChart3,
  CreditCard,
  PackagePlus,
  RefreshCw,
  Truck,
} from "lucide-react";

import {
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import {
  supBtnPrimary,
  supHeroGlowAccent,
  supHeroGlowPrimary,
  supHeroSection,
} from "../../suppliers/_components/supplier-ui-tokens";

export function SuppliesPageHeader({
  canViewApAging,
  canOpenNewSupply,
  listLoading,
  onRefresh,
  onNewSupply,
}: {
  canViewApAging: boolean;
  canOpenNewSupply: boolean;
  listLoading: boolean;
  onRefresh: () => void;
  onNewSupply: () => void;
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
          title="Supplies"
          description={
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Record stock received from vendors, track supplier invoices, and settle
              payables — one row per posted direct supply (Path B).
            </p>
          }
        />
        <div className="mt-5 flex flex-col gap-4 border-t border-border/45 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <DashboardQuickLinks
            compact
            links={[
              ...(canViewApAging
                ? [
                    {
                      href: APP_ROUTES.purchasingApAging,
                      label: "AP aging",
                      desc: "Open payables",
                      icon: BarChart3,
                    },
                  ]
                : []),
              {
                href: APP_ROUTES.purchasingRecordPayment,
                label: "Record payment",
                desc: "Manual AP",
                icon: CreditCard,
              },
              {
                href: APP_ROUTES.suppliers,
                label: "Suppliers",
                desc: "Vendors",
                icon: Truck,
              },
            ]}
          />
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-1.5 rounded-lg px-3.5 font-medium"
              disabled={listLoading}
              onClick={onRefresh}
            >
              <RefreshCw
                className={cn("size-3.5", listLoading && "animate-spin")}
                aria-hidden
              />
              Refresh
            </Button>
            {canOpenNewSupply ? (
              <Button
                type="button"
                className={supBtnPrimary}
                onClick={onNewSupply}
              >
                <PackagePlus className="size-4" aria-hidden />
                New supply
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
