"use client";

import Link from "next/link";
import { LogIn, UserRound } from "lucide-react";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { GetTheAppDialog } from "@/components/storefront/get-the-app-dialog";
import ShopSearchBar from "@/components/storefront/shop-search-bar";
import { ShopCartTrigger } from "@/components/storefront/shop-cart-trigger";
import { useStorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { APP_ROUTES } from "@/lib/config";
import { activeStorefrontCategorySlugFromPathname } from "@/lib/shop-url";

function AccountNavLink({
  className,
  iconClassName,
  showLabel,
}: {
  className: string;
  iconClassName?: string;
  showLabel?: boolean;
}) {
  const { href, label, onActivate } = useStorefrontAccountLink();
  // Pre-hydration the label reads "Account" (the hook's server snapshot), so
  // the glyph follows the label rather than the raw signed-in state.
  const Icon = label === "Sign in" ? LogIn : UserRound;

  return (
    <Link href={href} className={className} aria-label={label} onClick={onActivate}>
      {showLabel ? (
        <>
          <span className="flex size-8 items-center justify-center rounded-[3px] bg-[var(--storefront-paper,#f4f5f4)] transition-colors group-hover:bg-[var(--storefront-rule,#e4e6e4)]">
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="hidden whitespace-nowrap sm:inline">{label}</span>
        </>
      ) : (
        <Icon className={iconClassName ?? "size-4.5"} aria-hidden />
      )}
    </Link>
  );
}

function SearchFields({ primaryHex }: { primaryHex: string | null }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const pathSlug = activeStorefrontCategorySlugFromPathname(pathname);
  const categoryId = sp.get("categoryId")?.trim() || undefined;
  const typeId =
    sp.get("typeId")?.trim() || sp.get("departmentId")?.trim() || undefined;
  const searchActionPath =
    pathSlug !== "" ? pathname || APP_ROUTES.shop : undefined;
  return (
    <ShopSearchBar
      variant="header"
      defaultQuery={q || undefined}
      categoryId={pathSlug ? undefined : categoryId}
      typeId={typeId}
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
    <div className="border-b border-[var(--storefront-rule,#e4e6e4)] bg-[var(--storefront-paper-elevated,#fff)]/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-6 sm:py-2.5">
        <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-5">
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
              {slug ? (
                <GetTheAppDialog
                  slug={slug}
                  storeName={headerTitle}
                  triggerVariant="icon"
                />
              ) : null}
              <AccountNavLink
                className="inline-flex size-9 items-center justify-center rounded-[3px] text-[var(--storefront-ink-muted,#5c6560)] transition-colors hover:bg-[var(--storefront-paper,#f4f5f4)] hover:text-[var(--storefront-ink,#141816)]"
              />
              {slug ? (
                <ShopCartTrigger accentHex={primaryHex} compact className="px-1" />
              ) : null}
            </div>
          </div>

          <div className="min-w-0 flex-1 lg:max-w-2xl lg:justify-self-stretch">
            <Suspense
              fallback={
                <div
                  className="h-9 animate-pulse rounded-[3px] bg-[var(--storefront-paper,#f4f5f4)] sm:h-10"
                  aria-hidden
                />
              }
            >
              <SearchFields primaryHex={primaryHex} />
            </Suspense>
          </div>

          <div className="hidden shrink-0 items-center justify-end gap-1.5 sm:gap-2 lg:flex">
            <AccountNavLink
              showLabel
              className="group inline-flex items-center gap-1.5 rounded-[3px] px-2 py-1.5 text-sm font-medium text-[var(--storefront-ink-muted,#5c6560)] transition-colors hover:bg-[var(--storefront-paper,#f4f5f4)] hover:text-[var(--storefront-ink,#141816)]"
            />
            {slug ? <ShopCartTrigger accentHex={primaryHex} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
