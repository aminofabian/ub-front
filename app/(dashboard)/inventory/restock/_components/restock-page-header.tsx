"use client";

import { useMemo } from "react";
import { PackageX, RefreshCw } from "lucide-react";

import { DashboardQuickLinks } from "@/components/dashboard-page-ui";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import type { MeResponse } from "@/lib/api";
import { inventoryQuickLinksForUser } from "@/lib/inventory-access";
import { cn } from "@/lib/utils";

export function RestockPageHeader({
  me,
  canShowQuickLinks,
  loading,
  onRefresh,
}: {
  me: MeResponse | null | undefined;
  canShowQuickLinks: boolean;
  loading: boolean;
  onRefresh: () => void;
}) {
  const quickLinks = useMemo(
    () =>
      inventoryQuickLinksForUser(me).filter(
        (link) => link.href !== APP_ROUTES.inventoryRestock,
      ),
    [me],
  );

  return (
    <header className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2.5 py-1 sm:px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)]">
          <PackageX className="size-3.5" aria-hidden />
        </span>
        <h1 className="min-w-0 flex-1 truncate font-heading text-[15px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
          Out of stock
        </h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1 rounded-none px-2.5 text-[11px] font-medium"
          disabled={loading}
          onClick={onRefresh}
          aria-label="Refresh out-of-stock list"
        >
          <RefreshCw
            className={cn("size-3", loading && "animate-spin")}
            aria-hidden
          />
          Refresh
        </Button>
      </div>
      <ActiveScopeSubtitle className="text-[11px] tracking-[-0.02em]" />

      {canShowQuickLinks && quickLinks.length > 0 ? (
        <DashboardQuickLinks compact links={quickLinks} />
      ) : null}
    </header>
  );
}
