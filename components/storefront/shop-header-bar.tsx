"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { TenantLogo } from "@/components/brand/tenant-logo";
import ShopSearchBar from "@/components/storefront/shop-search-bar";
import { ShopCartTrigger } from "@/components/storefront/shop-cart-trigger";
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
      <div className="mx-auto max-w-7xl px-3 py-1.5 sm:px-6 sm:py-2">
        <div className="flex flex-col gap-1.5 lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-4">
          <div className="flex items-center gap-2 lg:contents">
            <TenantLogo
              brand={headerTitle}
              logoUrl={logoUrl}
              primaryColor={primaryHex}
              variant="storefront"
              size="sm"
              href={APP_ROUTES.shop}
              className="min-w-0 shrink lg:hidden"
            />
            <TenantLogo
              brand={headerTitle}
              logoUrl={logoUrl}
              primaryColor={primaryHex}
              variant="storefront"
              size="md"
              href={APP_ROUTES.shop}
              className="hidden shrink-0 self-center lg:inline-flex"
            />

            <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 lg:hidden">
              <Link
                href={APP_ROUTES.shopAccount}
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                aria-label="Account"
              >
                <UserRound className="size-4.5" aria-hidden />
              </Link>
              {slug ? (
                <ShopCartTrigger accentHex={primaryHex} compact className="px-1" />
              ) : null}
            </div>
          </div>

          <div className="min-w-0 flex-1 lg:max-w-2xl lg:justify-self-stretch">
            <Suspense
              fallback={
                <div
                  className="h-9 animate-pulse rounded-xl bg-muted/50 sm:h-10"
                  aria-hidden
                />
              }
            >
              <SearchFields primaryHex={primaryHex} />
            </Suspense>
          </div>

          <div className="hidden shrink-0 items-center justify-end gap-2 sm:gap-3 lg:flex">
            <Link
              href={APP_ROUTES.shopAccount}
              className="group inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/30 transition-colors group-hover:bg-muted/60">
                <UserRound className="h-4 w-4" aria-hidden />
              </span>
              <span className="hidden whitespace-nowrap sm:inline">
                Account
              </span>
            </Link>
            {slug ? <ShopCartTrigger accentHex={primaryHex} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
