"use client";

import Link from "next/link";
import { ClipboardList, UserRound } from "lucide-react";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { TenantLogo } from "@/components/brand/tenant-logo";
import ShopSearchBar from "@/components/storefront/shop-search-bar";
import { ShopBasketPill } from "@/components/storefront/shop-basket-pill";
import { APP_ROUTES } from "@/lib/config";
import { activeStorefrontCategorySlugFromPathname } from "@/lib/shop-url";

function SearchFields({ primaryHex }: { primaryHex: string | null }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const pathSlug = activeStorefrontCategorySlugFromPathname(pathname);
  const categoryId = sp.get("categoryId")?.trim() || undefined;
  const searchActionPath =
    pathSlug !== "" ? pathname || APP_ROUTES.shop : undefined;
  return (
    <ShopSearchBar
      variant="header"
      defaultQuery={q || undefined}
      categoryId={pathSlug ? undefined : categoryId}
      searchActionPath={searchActionPath}
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
    <div className="border-b border-border/40 bg-card/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-8">
          {/* ── Logo ── */}
          <TenantLogo
            brand={headerTitle}
            logoUrl={logoUrl}
            primaryColor={primaryHex}
            variant="storefront"
            size="lg"
            href={APP_ROUTES.shop}
            className="shrink-0 self-start"
          />

          {/* ── Search ── */}
          <div className="min-w-0 flex-1 lg:max-w-2xl lg:justify-self-stretch">
            <Suspense
              fallback={
                <div
                  className="h-12 animate-pulse rounded-xl bg-muted/50"
                  aria-hidden
                />
              }
            >
              <SearchFields primaryHex={primaryHex} />
            </Suspense>
          </div>

          {/* ── Actions ── */}
          <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
            <Link
              href={APP_ROUTES.shopAccount}
              className="group inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground sm:px-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/30 transition-colors group-hover:bg-muted/60">
                <UserRound className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="hidden whitespace-nowrap sm:inline">
                Account
              </span>
            </Link>
            <Link
              href={APP_ROUTES.shopCart}
              className="group inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground sm:px-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/30 transition-colors group-hover:bg-muted/60">
                <ClipboardList className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="hidden whitespace-nowrap sm:inline">Cart</span>
            </Link>
            {slug ? (
              <ShopBasketPill slug={slug} accentHex={primaryHex} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
