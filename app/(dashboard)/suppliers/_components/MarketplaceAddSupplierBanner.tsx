"use client";

import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import { SupFormSection } from "./supplier-layout-primitives";

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
    <SupFormSection
      className={className}
      title="Marketplace"
      hint="Platform suppliers can receive purchase orders in their portal. Connect instead of creating a duplicate private record."
    >
      <div className="flex flex-col gap-0 border-t border-border sm:flex-row sm:items-stretch">
        <div className="flex min-w-0 flex-1 items-start gap-2 border-b border-border px-2.5 py-2 sm:border-b-0 sm:border-r">
          <span className="flex size-7 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 text-primary">
            <Store className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0 py-0.5">
            <p className="text-sm font-medium text-foreground">
              Add from supplier marketplace
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Search by product or vendor, preview catalogue, and import links in
              one step.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end px-2.5 py-2">
          {onBrowseMarketplace ? (
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-none px-3 font-semibold"
              onClick={onBrowseMarketplace}
            >
              Browse marketplace
              <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
            </Button>
          ) : (
            <Button asChild size="sm" className="h-8 rounded-none px-3 font-semibold">
              <Link href={APP_ROUTES.marketplace}>
                Browse marketplace
                <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </SupFormSection>
  );
}
