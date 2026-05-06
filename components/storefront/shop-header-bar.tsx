"use client";

import Image from "next/image";
import Link from "next/link";
import { ClipboardList, Store, UserRound } from "lucide-react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import ShopSearchBar from "@/components/storefront/shop-search-bar";
import { ShopBasketPill } from "@/components/storefront/shop-basket-pill";
import { APP_ROUTES } from "@/lib/config";

function SearchFields({ primaryHex }: { primaryHex: string | null }) {
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const categoryId = sp.get("categoryId")?.trim() || undefined;
  return (
    <ShopSearchBar
      variant="header"
      defaultQuery={q || undefined}
      categoryId={categoryId}
      accentHex={primaryHex}
    />
  );
}

export function ShopHeaderBar({
  slug,
  headerTitle,
  logoUrl,
  primaryHex,
}: {
  slug: string;
  headerTitle: string;
  logoUrl: string | null;
  primaryHex: string | null;
}) {
  return (
    <div className="border-b border-border/60 bg-card">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-8">
          <Link
            href={APP_ROUTES.shop}
            className="flex shrink-0 items-center gap-3 self-start"
            aria-label={headerTitle}
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${headerTitle} logo`}
                width={180}
                height={56}
                className="h-12 w-auto max-w-[12rem] object-contain sm:h-14"
                unoptimized
              />
            ) : (
              <span className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {headerTitle}
              </span>
            )}
            {logoUrl ? <span className="sr-only">{headerTitle}</span> : null}
          </Link>

          <div className="min-w-0 flex-1 lg:max-w-3xl lg:justify-self-stretch">
            <Suspense
              fallback={<div className="h-12 animate-pulse rounded-xl bg-muted/70" aria-hidden />}
            >
              <SearchFields primaryHex={primaryHex} />
            </Suspense>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 sm:gap-4">
            <Link
              href={APP_ROUTES.shopAccount}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/40">
                <UserRound className="h-5 w-5" aria-hidden />
              </span>
              <span className="hidden whitespace-nowrap sm:inline">Account</span>
            </Link>
            <Link
              href={APP_ROUTES.shopCart}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/40">
                <ClipboardList className="h-5 w-5" aria-hidden />
              </span>
              <span className="hidden whitespace-nowrap sm:inline">Cart</span>
            </Link>
            {slug ? (
              <ShopBasketPill slug={slug} accentHex={primaryHex} />
            ) : (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Store className="h-5 w-5" aria-hidden />
                Shop
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
