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
  branchScopeLabel: _branchScopeLabel,
  onRefresh,
  onNewSupply,
}: {
  canViewApAging: boolean;
  /** Hide AP / suppliers shortcuts for kiosk roles that only receive stock. */
  canShowProcurementLinks: boolean;
  canOpenNewSupply: boolean;
  listLoading: boolean;
  branchScopeLabel?: string;
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
    <header className="min-w-0 space-y-2.5 border-b border-border/50 pb-3 sm:space-y-3 sm:pb-4">
      <DashboardPageHero
        compact
        showActiveScope
        icon={Truck}
        eyebrow="Purchasing"
        title="Supplies"
        description={
          <span className="hidden text-sm leading-relaxed text-muted-foreground sm:inline">
            Record vendor deliveries and track open payables.
          </span>
        }
      />

      {/* Mobile: full-width primary CTA — thumb zone */}
      {canOpenNewSupply ? (
        <Button
          type="button"
          className={cn(
            supBtnPrimary,
            "h-12 w-full gap-2 rounded-xl text-[15px] font-semibold touch-manipulation sm:hidden",
            "shadow-[0_8px_24px_-10px_color-mix(in_srgb,var(--primary)_55%,transparent)]",
            "active:scale-[0.98]",
          )}
          onClick={onNewSupply}
        >
          <PackagePlus className="size-5" aria-hidden />
          Receive new supply
        </Button>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 rounded-lg px-3 font-medium touch-manipulation sm:h-9"
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
            className={cn(supBtnPrimary, "hidden h-9 px-3.5 sm:inline-flex")}
            onClick={onNewSupply}
          >
            <PackagePlus className="size-3.5" aria-hidden />
            New supply
          </Button>
        ) : null}
      </div>

      {canShowProcurementLinks && quickLinks.length > 0 ? (
        <div className="hidden sm:block">
          <DashboardQuickLinks compact links={quickLinks} />
        </div>
      ) : null}

      {/* Mobile quick links as horizontal snap chips */}
      {canShowProcurementLinks && quickLinks.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 sm:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2.5",
                  "text-xs font-medium text-foreground shadow-sm touch-manipulation",
                  "active:bg-muted/40",
                )}
              >
                <Icon className="size-3.5 text-primary" aria-hidden />
                {link.label}
              </a>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}
