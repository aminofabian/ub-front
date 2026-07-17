"use client";

import {
  BarChart3,
  CreditCard,
  PackagePlus,
  RefreshCw,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { useSessionBranch } from "@/hooks/use-session-scope";

import { supBtnPrimary, supKicker } from "../../suppliers/_components/supplier-ui-tokens";

export function SuppliesPageHeader({
  canViewApAging,
  canShowProcurementLinks,
  canOpenNewSupply,
  listLoading,
  branchScopeLabel,
  onRefresh,
  onNewSupply,
}: {
  canViewApAging: boolean;
  canShowProcurementLinks: boolean;
  canOpenNewSupply: boolean;
  listLoading: boolean;
  branchScopeLabel?: string;
  onRefresh: () => void;
  onNewSupply: () => void;
}) {
  const { branchName } = useSessionBranch();
  const scope = branchScopeLabel?.trim() || branchName?.trim() || null;

  const quickLinks = [
    ...(canViewApAging
      ? [{ href: APP_ROUTES.purchasingApAging, label: "AP aging", icon: BarChart3 }]
      : []),
    {
      href: `${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`,
      label: "Pay open",
      icon: CreditCard,
    },
    { href: APP_ROUTES.suppliers, label: "Suppliers", icon: Truck },
  ];

  return (
    <header className="shrink-0 border-b border-border bg-[#e8eef5] dark:bg-muted/40">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center border border-border bg-card text-primary">
            <Truck className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <span className={supKicker}>Purchasing</span>
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                Supplies
              </h1>
              {scope ? (
                <span className="truncate text-[11px] text-muted-foreground">
                  · {scope}
                </span>
              ) : null}
            </div>
            <p className="hidden text-[11px] leading-none text-muted-foreground sm:block">
              Vendor receipts &amp; open payables
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {canShowProcurementLinks
            ? quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 border border-border bg-card px-2",
                      "text-[11px] font-medium text-muted-foreground",
                      "hover:border-primary/30 hover:bg-primary/[0.04] hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3" aria-hidden />
                    {link.label}
                  </Link>
                );
              })
            : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 rounded-none border-border px-2 text-[11px] font-medium"
            disabled={listLoading}
            onClick={onRefresh}
          >
            <RefreshCw
              className={cn("size-3", listLoading && "animate-spin")}
              aria-hidden
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {canOpenNewSupply ? (
            <Button
              type="button"
              size="sm"
              className={cn(supBtnPrimary, "h-7 rounded-none px-2.5 text-[11px]")}
              onClick={onNewSupply}
            >
              <PackagePlus className="size-3" aria-hidden />
              New supply
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
