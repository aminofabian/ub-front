"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchMarketplaceSupplierBySlug,
  type MarketplaceSupplierDetail,
} from "@/lib/marketplace-api";

import { MarketplaceOrderWorkspace } from "../../_components/marketplace-order-panel";

export default function MarketplaceSupplierSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [detail, setDetail] = useState<MarketplaceSupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchMarketplaceSupplierBySlug(slug)
      .then((row) => {
        if (!cancelled) setDetail(row);
      })
      .catch((error) => {
        if (!cancelled) {
          setDetail(null);
          toast.error(
            error instanceof Error ? error.message : "Supplier not found",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--muted)_40%,var(--background)))]">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <KioskLogo size="sm" href="/" />
            <Link
              href={APP_ROUTES.marketplace}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              Marketplace
            </Link>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Opening supplier…
        </div>
      ) : detail ? (
        <MarketplaceOrderWorkspace detail={detail} />
      ) : (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="font-heading text-xl font-semibold">Supplier not found</p>
          <Link
            href={APP_ROUTES.marketplace}
            className="mt-4 inline-block text-sm underline underline-offset-2"
          >
            Back to marketplace
          </Link>
        </div>
      )}
    </div>
  );
}
