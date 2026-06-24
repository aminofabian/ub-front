"use client";

import { useMemo } from "react";
import { PackageX, RefreshCw } from "lucide-react";

import { DashboardQuickLinks } from "@/components/dashboard-page-ui";
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
    <header className="min-w-0 space-y-1.5 border-b border-border/50 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <PackageX
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <h1 className="min-w-0 flex-1 truncate text-base font-bold leading-tight tracking-tight">
          Out of stock
        </h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 gap-1 rounded-md px-2 text-[11px] font-medium"
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

      {canShowQuickLinks && quickLinks.length > 0 ? (
        <DashboardQuickLinks compact links={quickLinks} />
      ) : null}
    </header>
  );
}
