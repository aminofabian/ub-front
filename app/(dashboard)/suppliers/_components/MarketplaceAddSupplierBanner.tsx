"use client";

import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

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

  const browseLabel = "Browse marketplace";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <Store
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <p className="text-[12px] leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">
            Looking for a vendor on Kiosk?
          </span>{" "}
          Search the marketplace by product or vendor and preview their shelf.
        </p>
      </div>
      {onBrowseMarketplace ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-full shrink-0 rounded-xl px-3 sm:w-auto"
          onClick={onBrowseMarketplace}
        >
          {browseLabel}
          <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
        </Button>
      ) : (
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 w-full shrink-0 rounded-xl px-3 sm:w-auto"
        >
          <Link href={APP_ROUTES.findSuppliers}>
            {browseLabel}
            <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
          </Link>
        </Button>
      )}
    </div>
  );
}
