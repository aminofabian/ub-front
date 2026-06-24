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

import { supBtnPrimary } from "../../suppliers/_components/supplier-ui-tokens";

export function SuppliesPageHeader({
  canViewApAging,
  canShowProcurementLinks,
  canOpenNewSupply,
  listLoading,
  onRefresh,
  onNewSupply,
}: {
  canViewApAging: boolean;
  /** Hide AP / suppliers shortcuts for kiosk roles that only receive stock. */
  canShowProcurementLinks: boolean;
  canOpenNewSupply: boolean;
  listLoading: boolean;
  onRefresh: () => void;
  onNewSupply: () => void;
}) {
  const quickLinks = [
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
      href: `${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`,
      label: "Pay open",
      desc: "Balances due",
      icon: CreditCard,
    },
    {
      href: APP_ROUTES.suppliers,
      label: "Suppliers",
      desc: "Vendors",
      icon: Truck,
    },
  ];

  return (
    <header className="min-w-0 space-y-2 border-b border-border/50 pb-3 sm:space-y-3 sm:pb-4">
      <DashboardPageHero
        compact
        icon={Truck}
        eyebrow="Purchasing"
        title="Supplies"
        description={
          <span className="hidden text-sm leading-relaxed text-muted-foreground sm:inline">
            Record vendor deliveries and track open payables.
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-lg px-3 font-medium"
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
            size="sm"
            className={cn(supBtnPrimary, "h-9 px-3.5")}
            onClick={onNewSupply}
          >
            <PackagePlus className="size-3.5" aria-hidden />
            New supply
          </Button>
        ) : null}
      </div>

      {canShowProcurementLinks && quickLinks.length > 0 ? (
        <DashboardQuickLinks compact links={quickLinks} />
      ) : null}
    </header>
  );
}
