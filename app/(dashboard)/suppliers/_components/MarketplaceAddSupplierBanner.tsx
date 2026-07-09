"use client";

import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { supCardInset, supKicker } from "./supplier-ui-tokens";

export function MarketplaceAddSupplierBanner({
  canViewMarketplace,
  onBrowseMarketplace,
  className,
}: {
  canViewMarketplace: boolean;
  onBrowseMarketplace?: () => void;
  className?: string;
}) {
  if (!canViewMarketplace) return null;

  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <p className={supKicker}>Marketplace</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Platform suppliers can receive purchase orders in their portal. Connect
          instead of creating a duplicate private record.
        </p>
      </div>
      <div
        className={cn(
          supCardInset,
          "flex flex-col gap-3 border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Store className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Add from supplier marketplace
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Search by product or vendor, preview catalogue, and import links in
              one step.
            </p>
          </div>
        </div>
        {onBrowseMarketplace ? (
          <Button
            type="button"
            size="sm"
            className="shrink-0 rounded-xl"
            onClick={onBrowseMarketplace}
          >
            Browse marketplace
            <ArrowRight className="ml-1.5 size-4" aria-hidden />
          </Button>
        ) : (
          <Button asChild size="sm" className="shrink-0 rounded-xl">
            <Link href={APP_ROUTES.marketplace}>
              Browse marketplace
              <ArrowRight className="ml-1.5 size-4" aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}
